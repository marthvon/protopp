import BTree, { MAX, MIN, compareValues } from '../classpp/BTree.js';
import { seal, unseal } from './sealExtra.js';

const KINDS = [ 'primary', 'unique', 'indexed', 'uniquelyOrdered', 'indexedOrdered' ];
const OPERATORS = [ 'eq', 'in', 'gt', 'gte', 'lt', 'lte', 'prefix' ];
const RANGES = [ 'gt', 'gte', 'lt', 'lte' ];
const SNAPSHOT_VERSION = 1;

function partKey(value) {
   if(value instanceof Date)
      return '\u0000d' + value.getTime();
   else if(typeof value === 'bigint')
      return '\u0000n' + value;
   else if(Array.isArray(value))
      return '\u0000a' + JSON.stringify(value.map(partKey));
   return value;
}

function isNullish(value, composite) {
   return value === undefined || value === null || (composite && Array.isArray(value) && value.some((part) => part === undefined || part === null));
}

function show(value) {
   try {
      return JSON.stringify(value) ?? String(value);
   } catch {
      return String(value);
   }
}

function isPlainObject(value) {
   if(value === null || typeof value !== 'object')
      return false;
   const proto = Object.getPrototypeOf(value);
   return proto === Object.prototype || proto === null;
}

function equalRange(key) {
   return { gte: [ key, MIN ], lte: [ key, MAX ] };
}

function defineIndex(name, spec) {
   const options = typeof spec === 'string'? { kind: spec } : spec;
   if(!isPlainObject(options) || !KINDS.includes(options.kind))
      throw new Error(`indexExtra ${name} must be one of ${KINDS.join(', ')}`);
   const fields = options.fields;
   if(fields !== undefined && (!Array.isArray(fields) || fields.length === 0))
      throw new Error(`indexExtra ${name} fields must be a non-empty array of field names`);
   else if(options.key !== undefined && typeof options.key !== 'function')
      throw new TypeError(`indexExtra ${name} key must be a function of the row`);
   else if(options.compare !== undefined && typeof options.compare !== 'function')
      throw new TypeError(`indexExtra ${name} compare must be a function`);
   else if(options.onConflict !== undefined && options.onConflict !== 'throw' && options.onConflict !== 'replace')
      throw new Error(`indexExtra ${name} onConflict must be "throw" or "replace"`);
   const ordered = options.kind === 'uniquelyOrdered' || options.kind === 'indexedOrdered';
   const compare = options.compare ?? compareValues;
   return {
      name,
      kind: options.kind,
      unique: options.kind !== 'indexed' && options.kind !== 'indexedOrdered',
      hashed: options.kind !== 'indexedOrdered',
      composite: fields !== undefined,
      compare,
      prefixable: compare === compareValues,
      onConflict: options.onConflict ?? 'throw',
      key: options.key ?? (fields? (row) => fields.map((field) => row[field]) : (row) => row[name]),
      map: new Map(),
      tree: ordered? new BTree((a, b) => compare(a[0], b[0]) || compareValues(a[1], b[1])) : null,
   };
}

function hashable(index, key) {
   return !(index.unique && index.kind !== 'primary' && isNullish(key, index.composite));
}

function attach(index, record, key, previous) {
   if(index.hashed && hashable(index, key)) {
      const hash = partKey(key);
      if(index.unique)
         index.map.set(hash, record);
      else {
         const bucket = index.map.get(hash);
         if(bucket) {
            if(previous)
               bucket.delete(previous);
            bucket.add(record);
         } else
            index.map.set(hash, new Set([ record ]));
      }
   }
   if(index.tree)
      index.tree.set([ key, record.id ], record);
}

function detach(index, record, key) {
   if(index.hashed && hashable(index, key)) {
      const hash = partKey(key);
      if(index.unique) {
         if(index.map.get(hash) === record)
            index.map.delete(hash);
      } else {
         const bucket = index.map.get(hash);
         if(bucket && bucket.delete(record) && bucket.size === 0)
            index.map.delete(hash);
      }
   }
   if(index.tree)
      index.tree.delete([ key, record.id ]);
}

function emit(table, hook, event) {
   for(const plugin of table.plugins.slice())
      if(typeof plugin[hook] === 'function')
         plugin[hook](event);
}

function write(table, row, fetchedAt, source) {
   if(row === null || typeof row !== 'object')
      throw new TypeError('indexExtra rows must be objects');
   const primary = table.indexes[0];
   const keys = table.indexes.map((index) => index.key(row));
   const id = keys[0];
   if(isNullish(id, primary.composite))
      throw new Error(`indexExtra row is missing its primary key ${primary.name}`);
   const previous = primary.map.get(partKey(id));
   if(source === 'restore' && previous && previous.fetchedAt >= fetchedAt)
      return null;
   const evicted = new Set();
   for(let slot = 1; slot < table.indexes.length; ++slot) {
      const index = table.indexes[slot];
      if(!index.unique || !hashable(index, keys[slot]))
         continue;
      const holder = index.map.get(partKey(keys[slot]));
      if(!holder || holder === previous)
         continue;
      else if(index.onConflict === 'replace')
         evicted.add(holder);
      else
         throw new Error(`indexExtra ${index.name} ${show(keys[slot])} already belongs to ${primary.name} ${show(holder.id)}`);
   }
   for(const holder of evicted)
      remove(table, holder, 'conflict');
   const record = { row, id, keys, fetchedAt, seq: previous? previous.seq : ++table.sequence };
   for(let slot = 0; slot < table.indexes.length; ++slot) {
      const index = table.indexes[slot];
      const same = previous !== undefined && Object.is(partKey(previous.keys[slot]), partKey(keys[slot]));
      if(previous && !same)
         detach(index, previous, previous.keys[slot]);
      attach(index, record, keys[slot], same? previous : null);
   }
   emit(table, 'upsert', { row, previous: previous?.row, fetchedAt, source, table });
   return record;
}

function remove(table, record, reason) {
   if(table.indexes[0].map.get(partKey(record.id)) !== record)
      return false;
   for(let slot = 0; slot < table.indexes.length; ++slot)
      detach(table.indexes[slot], record, record.keys[slot]);
   if(table.onDealloc)
      table.onDealloc(record.row);
   emit(table, 'delete', { row: record.row, fetchedAt: record.fetchedAt, reason, table });
   return true;
}

function isStale(table, record) {
   if(table.plugins.length === 0)
      return false;
   const event = { row: record.row, fetchedAt: record.fetchedAt, age: table.now() - record.fetchedAt, table };
   for(const plugin of table.plugins)
      if(typeof plugin.stale === 'function' && plugin.stale(event) === true)
         return true;
   return false;
}

function visible(table, record) {
   if(!isStale(table, record))
      return true;
   table.expired.add(record);
   return false;
}

function reading(table, run) {
   ++table.reading;
   try {
      return run();
   } finally {
      if(--table.reading === 0 && table.expired.size) {
         const expired = Array.from(table.expired);
         table.expired.clear();
         for(const record of expired)
            remove(table, record, 'stale');
      }
   }
}

function indexNamed(table, name) {
   const slot = table.slots.get(name);
   if(slot === undefined)
      throw new Error(`indexExtra has no index named ${name}`);
   return table.indexes[slot];
}

function operatorOf(name, raw) {
   if(!isPlainObject(raw))
      return { eq: raw };
   const op = {};
   for(const [ key, value ] of Object.entries(raw)) {
      if(!OPERATORS.includes(key))
         throw new Error(`indexExtra where.${name} has an unknown operator ${key}; use ${OPERATORS.join(', ')}`);
      else if(key === 'in' && !Array.isArray(value))
         throw new TypeError(`indexExtra where.${name}.in must be an array`);
      else if(key === 'prefix' && !Array.isArray(value) && typeof value !== 'string')
         throw new TypeError(`indexExtra where.${name}.prefix must be a string or an array`);
      else if(value !== undefined)
         op[key] = value;
   }
   return op;
}

function parseWhere(table, where) {
   if(where === undefined || where === null)
      return [];
   else if(!isPlainObject(where))
      throw new TypeError('indexExtra where must be a plain object');
   const conditions = [];
   for(const [ name, raw ] of Object.entries(where)) {
      if(raw === undefined)
         continue;
      const slot = table.slots.get(name);
      const index = slot === undefined? null : table.indexes[slot];
      conditions.push({ name, slot, index, op: operatorOf(name, raw), compare: index? index.compare : compareValues });
   }
   return conditions;
}

function hasPrefix(value, prefix) {
   if(typeof prefix === 'string')
      return typeof value === 'string' && value.startsWith(prefix);
   else if(!Array.isArray(value) || value.length < prefix.length)
      return false;
   for(let i = 0; i < prefix.length; ++i)
      if(compareValues(value[i], prefix[i]) !== 0)
         return false;
   return true;
}

function matches(condition, record) {
   const value = condition.index? record.keys[condition.slot] : record.row[condition.name];
   const { op, compare } = condition;
   if('eq' in op && compare(value, op.eq) !== 0)
      return false;
   else if(op.in && !op.in.some((item) => compare(value, item) === 0))
      return false;
   else if('gt' in op && compare(value, op.gt) <= 0)
      return false;
   else if('gte' in op && compare(value, op.gte) < 0)
      return false;
   else if('lt' in op && compare(value, op.lt) >= 0)
      return false;
   else if('lte' in op && compare(value, op.lte) > 0)
      return false;
   else if(op.prefix !== undefined && !hasPrefix(value, op.prefix))
      return false;
   return true;
}

function lookup(index, values) {
   if(index.hashed && values.every((value) => hashable(index, value))) {
      if(!index.unique && values.length === 1) {
         const bucket = index.map.get(partKey(values[0])) ?? new Set();
         return { records: bucket, size: bucket.size };
      }
      const records = new Set();
      for(const value of values) {
         const found = index.map.get(partKey(value));
         if(found === undefined)
            continue;
         else if(index.unique)
            records.add(found);
         else
            for(const record of found)
               records.add(record);
      }
      return { records, size: records.size };
   } else if(index.tree) {
      const records = new Set();
      for(const value of values)
         for(const record of index.tree.values(equalRange(value)))
            records.add(record);
      return { records, size: records.size };
   }
   return null;
}

function rangeOf(index, op) {
   if(op.prefix !== undefined) {
      if(!index.prefixable)
         return null;
      else if(typeof op.prefix === 'string')
         return { gte: [ op.prefix, MIN ], lt: [ op.prefix + '￿', MIN ] };
      return { gte: [ op.prefix, MIN ], lte: [ [ ...op.prefix, MAX ], MAX ] };
   }
   const range = {};
   if('gt' in op)
      range.gt = [ op.gt, MAX ];
   if('gte' in op)
      range.gte = [ op.gte, MIN ];
   if('lt' in op)
      range.lt = [ op.lt, MIN ];
   if('lte' in op)
      range.lte = [ op.lte, MAX ];
   return range;
}

function candidatesOf({ index, op }) {
   if(!index)
      return null;
   else if('eq' in op)
      return lookup(index, [ op.eq ]);
   else if(op.in)
      return lookup(index, op.in);
   else if(index.tree && (op.prefix !== undefined || RANGES.some((key) => key in op))) {
      const range = rangeOf(index, op);
      return range? { index, range, size: Infinity } : null;
   }
   return null;
}

function chooseDriver(conditions) {
   let best = null;
   for(const condition of conditions) {
      const candidate = candidatesOf(condition);
      if(candidate && (!best || candidate.size < best.size))
         best = candidate;
   }
   return best;
}

function parseOrder(table, orderBy) {
   if(orderBy === undefined || orderBy === null)
      return null;
   else if(typeof orderBy === 'function')
      return { compare: (a, b) => orderBy(a.row, b.row) || a.seq - b.seq, stream: null };
   const terms = (Array.isArray(orderBy)? orderBy : [ orderBy ]).map((term) => {
      if(typeof term !== 'string' || term === '' || term === '-')
         throw new TypeError('indexExtra orderBy takes field or index names, prefixed with - for descending, or a compare function');
      const desc = term.startsWith('-');
      const name = desc? term.slice(1) : term;
      const slot = table.slots.get(name);
      const index = slot === undefined? null : table.indexes[slot];
      return { name, slot, index, desc, compare: index? index.compare : compareValues };
   });
   if(terms.length === 0)
      return null;
   const head = terms[0];
   const compare = (a, b) => {
      for(const term of terms) {
         const result = term.compare(term.index? a.keys[term.slot] : a.row[term.name], term.index? b.keys[term.slot] : b.row[term.name]);
         if(result !== 0)
            return term.desc? -result : result;
      }
      const tie = compareValues(a.id, b.id);
      return head.desc? -tie : tie;
   };
   return { compare, stream: terms.length === 1 && head.index?.tree? { index: head.index, reverse: head.desc } : null };
}

function streamOf(table, sort, driver) {
   if(!sort?.stream)
      return null;
   const { index, reverse } = sort.stream;
   if(driver?.range)
      return driver.index === index? { records: index.tree.values({ ...driver.range, reverse }), members: null } : null;
   else if(driver && driver.size * 8 < table.size)
      return null;
   return { records: index.tree.values({ reverse }), members: driver? driver.records : null };
}

function sourceOf(table, driver) {
   if(!driver)
      return table.indexes[0].map.values();
   else if(driver.range)
      return driver.index.tree.values(driver.range);
   return driver.records;
}

function checkPage(offset, limit) {
   if(!Number.isInteger(offset) || offset < 0)
      throw new RangeError('indexExtra offset must be an integer of 0 or more');
   else if(limit !== Infinity && (!Number.isInteger(limit) || limit < 0))
      throw new RangeError('indexExtra limit must be an integer of 0 or more');
}

function checkSnapshot(snapshot) {
   if(!isPlainObject(snapshot) || snapshot.v !== SNAPSHOT_VERSION || !Array.isArray(snapshot.rows))
      throw new TypeError('indexExtra snapshot is not a version 1 snapshot');
   for(const entry of snapshot.rows)
      if(!Array.isArray(entry) || entry.length !== 2 || !Number.isFinite(entry[0]) || entry[1] === null || typeof entry[1] !== 'object')
         throw new TypeError('indexExtra snapshot rows must be [fetchedAt, row] pairs');
}

export class IndexTable {
   constructor(schema, { now = Date.now, onDealloc, plugins = [] } = {}) {
      if(!isPlainObject(schema))
         throw new TypeError('indexExtra needs a schema object');
      else if(typeof now !== 'function')
         throw new TypeError('indexExtra now must be a function returning a timestamp');
      const indexes = [];
      for(const [ name, spec ] of Object.entries(schema))
         if(spec !== undefined && spec !== null)
            indexes.push(defineIndex(name, spec));
      const primaries = indexes.filter((index) => index.kind === 'primary');
      if(primaries.length !== 1)
         throw new Error('indexExtra schema needs exactly one primary index');
      this.indexes = [ primaries[0], ...indexes.filter((index) => index.kind !== 'primary') ];
      this.slots = new Map(this.indexes.map((index, slot) => [ index.name, slot ]));
      this.now = now;
      this.onDealloc = onDealloc;
      this.plugins = [];
      this.expired = new Set();
      this.reading = 0;
      this.sequence = 0;
      for(const plugin of plugins)
         this.use(plugin);
   }
   get size() {
      return this.indexes[0].map.size;
   }
   upsert(...rows) {
      const fetchedAt = this.now();
      for(const row of rows)
         write(this, row, fetchedAt, 'upsert');
      return this;
   }
   patch(key, changes) {
      const record = this.indexes[0].map.get(partKey(key));
      if(!record || !reading(this, () => visible(this, record)))
         return undefined;
      const row = { ...record.row, ...changes };
      if(!Object.is(partKey(this.indexes[0].key(row)), partKey(record.id)))
         throw new Error('indexExtra patch cannot change the primary key; delete the row and upsert the new one');
      write(this, row, record.fetchedAt, 'patch');
      return row;
   }
   has(key) {
      return this.get(key) !== undefined;
   }
   get(key, name = this.indexes[0].name) {
      const index = indexNamed(this, name);
      return reading(this, () => {
         if(index.unique && index.hashed) {
            const record = hashable(index, key)? index.map.get(partKey(key)) : undefined;
            return record && visible(this, record)? record.row : undefined;
         }
         const records = index.hashed? (index.map.get(partKey(key)) ?? []) : index.tree.values(equalRange(key));
         const kept = [];
         for(const record of records)
            if(visible(this, record))
               kept.push(record);
         return kept.sort((a, b) => a.seq - b.seq).map((record) => record.row);
      });
   }
   delete(...keys) {
      let deleted = 0;
      for(const key of keys) {
         const record = this.indexes[0].map.get(partKey(key));
         if(record && remove(this, record, 'delete'))
            ++deleted;
      }
      return deleted;
   }
   fetchedAt(key) {
      return this.indexes[0].map.get(partKey(key))?.fetchedAt;
   }
   query({ where, filter, orderBy, offset = 0, limit = Infinity } = {}) {
      checkPage(offset, limit);
      if(filter !== undefined && typeof filter !== 'function')
         throw new TypeError('indexExtra filter must be a function of the row');
      const conditions = parseWhere(this, where);
      const sort = parseOrder(this, orderBy);
      const driver = chooseDriver(conditions);
      return reading(this, () => {
         const accept = (record) => conditions.every((condition) => matches(condition, record)) && visible(this, record) && (!filter || filter(record.row));
         const stream = streamOf(this, sort, driver);
         if(stream) {
            const rows = [];
            let skipped = 0;
            if(limit === 0)
               return rows;
            for(const record of stream.records) {
               if((stream.members && !stream.members.has(record)) || !accept(record))
                  continue;
               else if(skipped < offset)
                  ++skipped;
               else if(rows.push(record.row) >= limit)
                  break;
            }
            return rows;
         }
         const matched = [];
         for(const record of sourceOf(this, driver))
            if(accept(record))
               matched.push(record);
         if(sort)
            matched.sort(sort.compare);
         else if(driver)
            matched.sort((a, b) => a.seq - b.seq);
         return matched.slice(offset, offset + limit).map((record) => record.row);
      });
   }
   count(query = {}) {
      return this.query({ ...query, offset: 0, limit: Infinity }).length;
   }
   rows() {
      return this.query();
   }
   [Symbol.iterator]() {
      return this.rows()[Symbol.iterator]();
   }
   invalidate(spec) {
      let doomed;
      if(typeof spec === 'function')
         doomed = (record) => spec(record.row, record.fetchedAt) === true;
      else if(spec && spec.olderThan !== undefined) {
         const now = this.now();
         doomed = (record) => now - record.fetchedAt > spec.olderThan;
      } else if(spec && spec.before !== undefined) {
         const before = +spec.before;
         doomed = (record) => record.fetchedAt < before;
      } else
         throw new TypeError('indexExtra invalidate takes a predicate, { olderThan: ms }, or { before: time }');
      const records = Array.from(this.indexes[0].map.values()).filter(doomed);
      for(const record of records)
         remove(this, record, 'invalidate');
      return records.map((record) => record.row);
   }
   use(plugin) {
      if(!plugin || typeof plugin !== 'object')
         throw new TypeError('indexExtra plugins are objects with upsert, delete, or stale hooks');
      this.plugins.push(plugin);
      return () => {
         const index = this.plugins.indexOf(plugin);
         if(index !== -1)
            this.plugins.splice(index, 1);
      };
   }
   clear() {
      const records = Array.from(this.indexes[0].map.values());
      for(const record of records)
         remove(this, record, 'clear');
      return records.length;
   }
   snapshot() {
      return reading(this, () => {
         const rows = [];
         for(const record of this.indexes[0].map.values())
            if(visible(this, record))
               rows.push([ record.fetchedAt, record.row ]);
         return { v: SNAPSHOT_VERSION, rows };
      });
   }
   restore(snapshot, { revive } = {}) {
      checkSnapshot(snapshot);
      let restored = 0;
      for(const [ fetchedAt, row ] of snapshot.rows)
         if(write(this, revive? revive(row) : row, fetchedAt, 'restore'))
            ++restored;
      return restored;
   }
   encode(options = {}) {
      return seal(this.snapshot(), options);
   }
   async decode(sealed, options = {}) {
      return this.restore(await unseal(sealed, options), options);
   }
}

export function indexExtra(schema, options) {
   return new IndexTable(schema, options);
}

export function expireAfter(ms) {
   if(!Number.isFinite(ms) || ms < 0)
      throw new RangeError('expireAfter needs a number of milliseconds of 0 or more');
   return { stale: ({ age }) => age > ms };
}
