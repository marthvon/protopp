export const MIN = Symbol('BTree.MIN');
export const MAX = Symbol('BTree.MAX');

function typeRank(value) {
   if(value === undefined)
      return 0;
   else if(value === null)
      return 1;
   switch(typeof value) {
      case 'boolean': return 2;
      case 'number': return Number.isNaN(value)? 4 : 3;
      case 'bigint': return 3;
      case 'string': return 5;
   }
   if(value instanceof Date)
      return 6;
   else if(Array.isArray(value))
      return 7;
   return 8;
}

function order(a, b) {
   return a < b? -1 : (a > b? 1 : 0);
}

export function compareValues(a, b) {
   if(a === b)
      return 0;
   else if(a === MIN || b === MAX)
      return -1;
   else if(a === MAX || b === MIN)
      return 1;
   const left = typeRank(a), right = typeRank(b);
   if(left !== right)
      return left < right? -1 : 1;
   switch(left) {
      case 6: {
         const x = a.getTime(), y = b.getTime();
         if(Number.isNaN(x) || Number.isNaN(y))
            return Number.isNaN(x)? (Number.isNaN(y)? 0 : 1) : -1;
         return order(x, y);
      }
      case 7: {
         const length = Math.min(a.length, b.length);
         for(let i = 0; i < length; ++i) {
            const result = compareValues(a[i], b[i]);
            if(result !== 0)
               return result;
         }
         return order(a.length, b.length);
      }
      case 8:
         return order(String(a), String(b));
      default:
         return order(a, b);
   }
}

function leaf() {
   return { leaf: true, keys: [], values: [], prev: null, next: null };
}

function sizeOf(node) {
   return node.leaf? node.keys.length : node.size;
}

function branch(keys, children) {
   let size = 0;
   for(const child of children)
      size += sizeOf(child);
   return { leaf: false, keys, children, size };
}

function lowerBound(keys, key, compare) {
   let lo = 0, hi = keys.length;
   while(lo < hi) {
      const mid = (lo + hi) >>> 1;
      if(compare(keys[mid], key) < 0)
         lo = mid + 1;
      else
         hi = mid;
   }
   return lo;
}

function upperBound(keys, key, compare) {
   let lo = 0, hi = keys.length;
   while(lo < hi) {
      const mid = (lo + hi) >>> 1;
      if(compare(keys[mid], key) <= 0)
         lo = mid + 1;
      else
         hi = mid;
   }
   return lo;
}

function findLeaf(tree, key, nodes, indexes) {
   let node = tree.root;
   while(!node.leaf) {
      const index = upperBound(node.keys, key, tree.compare);
      if(nodes) {
         nodes.push(node);
         indexes.push(index);
      }
      node = node.children[index];
   }
   return node;
}

function countBefore(tree, key, inclusive) {
   let node = tree.root, count = 0;
   while(!node.leaf) {
      const index = upperBound(node.keys, key, tree.compare);
      for(let child = 0; child < index; ++child)
         count += sizeOf(node.children[child]);
      node = node.children[index];
   }
   return count + (inclusive? upperBound : lowerBound)(node.keys, key, tree.compare);
}

function locate(tree, position) {
   let node = tree.root;
   while(!node.leaf) {
      let child = 0;
      while(position >= sizeOf(node.children[child])) {
         position -= sizeOf(node.children[child]);
         ++child;
      }
      node = node.children[child];
   }
   return { leaf: node, at: position };
}

function splitUp(tree, node, nodes, indexes) {
   const right = leaf();
   const mid = node.keys.length >>> 1;
   right.keys = node.keys.splice(mid);
   right.values = node.values.splice(mid);
   right.next = node.next;
   if(right.next)
      right.next.prev = right;
   right.prev = node;
   node.next = right;
   let separator = right.keys[0], left = node, sibling = right;
   for(let level = nodes.length - 1; level >= 0; --level) {
      const parent = nodes[level], index = indexes[level];
      parent.keys.splice(index, 0, separator);
      parent.children.splice(index + 1, 0, sibling);
      if(parent.children.length <= tree.order)
         return;
      const cut = Math.ceil(parent.children.length / 2);
      sibling = branch(parent.keys.splice(cut), parent.children.splice(cut));
      separator = parent.keys.pop();
      parent.size -= sibling.size;
      left = parent;
   }
   tree.root = branch([ separator ], [ left, sibling ]);
}

function rebalance(tree, node, nodes, indexes) {
   const leafMin = tree.order >>> 1;
   const branchMin = Math.ceil(tree.order / 2);
   for(let level = nodes.length - 1; level >= 0; --level) {
      if(node.leaf? node.keys.length >= leafMin : node.children.length >= branchMin)
         return;
      const parent = nodes[level], index = indexes[level];
      const left = index > 0? parent.children[index - 1] : null;
      const right = index < parent.children.length - 1? parent.children[index + 1] : null;
      if(node.leaf) {
         if(left && left.keys.length > leafMin) {
            node.keys.unshift(left.keys.pop());
            node.values.unshift(left.values.pop());
            parent.keys[index - 1] = node.keys[0];
            return;
         } else if(right && right.keys.length > leafMin) {
            node.keys.push(right.keys.shift());
            node.values.push(right.values.shift());
            parent.keys[index] = right.keys[0];
            return;
         } else if(left) {
            left.keys.push(...node.keys);
            left.values.push(...node.values);
            left.next = node.next;
            if(node.next)
               node.next.prev = left;
            parent.keys.splice(index - 1, 1);
            parent.children.splice(index, 1);
         } else {
            node.keys.push(...right.keys);
            node.values.push(...right.values);
            node.next = right.next;
            if(right.next)
               right.next.prev = node;
            parent.keys.splice(index, 1);
            parent.children.splice(index + 1, 1);
         }
      } else if(left && left.children.length > branchMin) {
         const moved = left.children.pop();
         node.children.unshift(moved);
         node.keys.unshift(parent.keys[index - 1]);
         parent.keys[index - 1] = left.keys.pop();
         left.size -= sizeOf(moved);
         node.size += sizeOf(moved);
         return;
      } else if(right && right.children.length > branchMin) {
         const moved = right.children.shift();
         node.children.push(moved);
         node.keys.push(parent.keys[index]);
         parent.keys[index] = right.keys.shift();
         right.size -= sizeOf(moved);
         node.size += sizeOf(moved);
         return;
      } else if(left) {
         left.keys.push(parent.keys[index - 1], ...node.keys);
         left.children.push(...node.children);
         left.size += node.size;
         parent.keys.splice(index - 1, 1);
         parent.children.splice(index, 1);
      } else {
         node.keys.push(parent.keys[index], ...right.keys);
         node.children.push(...right.children);
         node.size += right.size;
         parent.keys.splice(index, 1);
         parent.children.splice(index + 1, 1);
      }
      node = parent;
   }
   if(!tree.root.leaf && tree.root.children.length === 1)
      tree.root = tree.root.children[0];
}

function span(tree, { gt, gte, lt, lte } = {}) {
   let lo = 0, hi = tree.size;
   if(gt !== undefined)
      lo = Math.max(lo, countBefore(tree, gt, true));
   if(gte !== undefined)
      lo = Math.max(lo, countBefore(tree, gte, false));
   if(lt !== undefined)
      hi = Math.min(hi, countBefore(tree, lt, false));
   if(lte !== undefined)
      hi = Math.min(hi, countBefore(tree, lte, true));
   return { lo, hi };
}

function checkOptions({ offset = 0, limit = Infinity, mask } = {}) {
   /* DEV START */
   if(!Number.isInteger(offset) || offset < 0)
      throw new RangeError('BTree offset must be an integer of 0 or more');
   if(limit !== Infinity && (!Number.isInteger(limit) || limit < 0))
      throw new RangeError('BTree limit must be an integer of 0 or more');
   if(mask !== undefined && typeof mask !== 'function' && typeof mask?.has !== 'function')
      throw new TypeError('BTree mask must be a Set of values to keep or a function (value, key) => boolean');
   /* DEV END */
}

function* walk(tree, options = {}) {
   const { reverse = false, offset = 0, limit = Infinity, mask } = options;
   const keep = mask === undefined? null : (typeof mask === 'function'? mask : (value) => mask.has(value));
   const { lo, hi } = span(tree, options);
   const jumped = keep? 0 : Math.min(offset, Math.max(hi - lo, 0));
   let remaining = hi - lo - jumped;
   if(remaining <= 0 || limit === 0)
      return;
   let skip = keep? offset : 0, left = limit;
   let { leaf: node, at } = locate(tree, reverse? hi - 1 - jumped : lo + jumped);
   const version = tree.version;
   while(remaining-- > 0) {
      const key = node.keys[at], value = node.values[at];
      if(reverse? --at < 0 : ++at >= node.keys.length) {
         node = reverse? node.prev : node.next;
         at = reverse && node? node.keys.length - 1 : 0;
      }
      if(keep && !keep(value, key))
         continue;
      else if(skip > 0) {
         --skip;
         continue;
      }
      yield [ key, value ];
      if(tree.version !== version)
         throw new Error('BTree changed while it was being iterated; collect the entries first, then change the tree');
      if(--left === 0)
         return;
   }
}

export class BTreeView {
   #tree;
   #options;

   constructor(tree, options = {}) {
      checkOptions(options);
      this.#tree = tree;
      this.#options = { ...options };
   }

   [Symbol.iterator]() {
      return walk(this.#tree, this.#options);
   }

   *keys() {
      for(const [ key ] of this)
         yield key;
   }

   *values() {
      for(const [ , value ] of this)
         yield value;
   }

   toArray() {
      return Array.from(this);
   }

   count() {
      const { offset = 0, limit = Infinity, mask } = this.#options;
      if(mask === undefined) {
         const { lo, hi } = span(this.#tree, this.#options);
         return Math.max(0, Math.min(hi - lo - offset, limit));
      }
      let count = 0;
      const entries = this[Symbol.iterator]();
      while(!entries.next().done)
         ++count;
      return count;
   }
}

export default class BTree {
   constructor(compare = compareValues, order = 32) {
      /* DEV START */
      if(typeof compare !== 'function')
         throw new TypeError('BTree compare must be a function');
      if(!Number.isInteger(order) || order < 3)
         throw new Error('BTree order must be an integer greater than 2');
      /* DEV END */
      this.compare = compare;
      this.order = order;
      this.root = leaf();
      this.size = 0;
      this.version = 0;
   }
   has(key) {
      const node = findLeaf(this, key);
      const at = lowerBound(node.keys, key, this.compare);
      return at < node.keys.length && this.compare(node.keys[at], key) === 0;
   }
   get(key) {
      const node = findLeaf(this, key);
      const at = lowerBound(node.keys, key, this.compare);
      return at < node.keys.length && this.compare(node.keys[at], key) === 0? node.values[at] : undefined;
   }
   set(key, value) {
      const nodes = [], indexes = [];
      const node = findLeaf(this, key, nodes, indexes);
      const at = lowerBound(node.keys, key, this.compare);
      if(at < node.keys.length && this.compare(node.keys[at], key) === 0) {
         node.values[at] = value;
         return this;
      }
      node.keys.splice(at, 0, key);
      node.values.splice(at, 0, value);
      for(const parent of nodes)
         ++parent.size;
      ++this.size;
      ++this.version;
      if(node.keys.length > this.order)
         splitUp(this, node, nodes, indexes);
      return this;
   }
   delete(key) {
      const nodes = [], indexes = [];
      const node = findLeaf(this, key, nodes, indexes);
      const at = lowerBound(node.keys, key, this.compare);
      if(at >= node.keys.length || this.compare(node.keys[at], key) !== 0)
         return false;
      node.keys.splice(at, 1);
      node.values.splice(at, 1);
      for(const parent of nodes)
         --parent.size;
      --this.size;
      ++this.version;
      rebalance(this, node, nodes, indexes);
      return true;
   }
   clear() {
      this.root = leaf();
      this.size = 0;
      ++this.version;
   }
   at(index) {
      /* DEV START */
      if(!Number.isInteger(index))
         throw new TypeError('BTree at needs an integer index');
      /* DEV END */
      const position = index < 0? this.size + index : index;
      if(position < 0 || position >= this.size)
         return undefined;
      const { leaf: node, at } = locate(this, position);
      return [ node.keys[at], node.values[at] ];
   }
   rank(key) {
      return countBefore(this, key, false);
   }
   first() {
      return this.at(0);
   }
   last() {
      return this.at(-1);
   }
   view(options) {
      return new BTreeView(this, options);
   }
   entries(options) {
      checkOptions(options);
      return walk(this, options);
   }
   keys(options) {
      return this.view(options).keys();
   }
   values(options) {
      return this.view(options).values();
   }
   [Symbol.iterator]() {
      return walk(this);
   }
}
