import { seal, sealDataKey, unseal, unsealDataKey } from './sealExtra.js';

const VERSION = 1;
const BACKENDS = [ 'cache', 'local', 'session', 'memory' ];
const CACHE_ORIGIN = 'https://protopp.invalid/';
const ENTRY = 'e:';
const DATA_KEY = 'k';

function andThen(value, next) {
   return value instanceof Promise? value.then(next) : next(value);
}

function parse(text) {
   try {
      return JSON.parse(text);
   } catch {
      return null;
   }
}

function cacheStorage(name) {
   let opened;
   const open = () => opened ??= globalThis.caches.open(name);
   const url = (id) => CACHE_ORIGIN + encodeURIComponent(id);
   return {
      async read(id) {
         const response = await (await open()).match(url(id));
         return response? response.text() : undefined;
      },
      async write(id, text) {
         await (await open()).put(url(id), new Response(text, { headers: { 'content-type': 'application/json' } }));
      },
      async remove(id) {
         await (await open()).delete(url(id));
      },
      async ids() {
         return (await (await open()).keys()).map((request) => decodeURIComponent(request.url.slice(CACHE_ORIGIN.length)));
      },
   };
}

function webStorage(area, name) {
   const prefix = `${name}:`;
   return {
      read: (id) => area.getItem(prefix + id) ?? undefined,
      write: (id, text) => area.setItem(prefix + id, text),
      remove: (id) => area.removeItem(prefix + id),
      ids() {
         const ids = [];
         for(let i = 0; i < area.length; ++i) {
            const stored = area.key(i);
            if(stored?.startsWith(prefix))
               ids.push(stored.slice(prefix.length));
         }
         return ids;
      },
   };
}

function memoryStorage() {
   const entries = new Map();
   return {
      read: (id) => entries.get(id),
      write: (id, text) => {
         entries.set(id, text);
      },
      remove: (id) => {
         entries.delete(id);
      },
      ids: () => Array.from(entries.keys()),
   };
}

function backendOf(backend, name) {
   if(typeof backend === 'object')
      return backend;
   else if(backend === 'memory')
      return memoryStorage();
   else if(backend === 'cache') {
      if(typeof globalThis.caches?.open !== 'function')
         throw new Error('storageExtra "cache" needs the Cache Storage API, which browsers offer only on https or localhost');
      return cacheStorage(name);
   }
   const area = backend === 'local'? 'localStorage' : 'sessionStorage';
   let storage;
   try {
      storage = globalThis[area];
   } catch(error) {
      throw new Error(`storageExtra "${backend}" cannot reach ${area}`, { cause: error });
   }
   if(!storage)
      throw new Error(`storageExtra "${backend}" needs ${area}, which this runtime does not have`);
   return webStorage(storage, name);
}

export class StorageExtra {
   #options;
   #backend;
   #dataKey;

   constructor({ backend = 'cache', name = 'protopp', ttl, encrypt, plaintext = false, now = Date.now } = {}) {
      /* DEV START */
      if(typeof backend === 'string'? !BACKENDS.includes(backend) : ![ 'read', 'write', 'remove', 'ids' ].every((method) => typeof backend?.[method] === 'function'))
         throw new TypeError('storageExtra backend must be "cache", "local", "session", "memory", or an object with read, write, remove, and ids');
      if(typeof name !== 'string' || name === '')
         throw new TypeError('storageExtra name must be a non-empty string');
      if(ttl !== undefined && !(Number.isFinite(ttl) && ttl >= 0))
         throw new RangeError('storageExtra ttl must be a number of milliseconds of 0 or more');
      if(encrypt === undefined && plaintext !== true)
         throw new TypeError('storageExtra needs encrypt: { publicKeys, privateKeys } or plaintext: true');
      if(encrypt !== undefined && plaintext === true)
         throw new TypeError('storageExtra takes encrypt or plaintext: true, not both');
      if(encrypt !== undefined && (encrypt.publicKeys === undefined || encrypt.privateKeys === undefined))
         throw new TypeError('storageExtra encrypt needs publicKeys and privateKeys');
      /* DEV END */
      this.#options = { backend, name, ttl, encrypt, now };
   }

   get(key) {
      /* DEV START */
      if(typeof key !== 'string')
         throw new TypeError('storageExtra keys are strings');
      /* DEV END */
      return andThen(this.#store().read(ENTRY + key), (text) => text === undefined? undefined : this.#open(key, text));
   }

   set(key, value, { ttl = this.#options.ttl } = {}) {
      /* DEV START */
      if(typeof key !== 'string')
         throw new TypeError('storageExtra keys are strings');
      if(value === undefined)
         throw new TypeError('storageExtra cannot store undefined; use delete');
      if(ttl !== undefined && !(Number.isFinite(ttl) && ttl >= 0))
         throw new RangeError('storageExtra ttl must be a number of milliseconds of 0 or more');
      /* DEV END */
      const at = this.#options.now();
      const payload = { at, exp: ttl === undefined? null : at + ttl, data: value };
      if(!this.#options.encrypt)
         return this.#store().write(ENTRY + key, JSON.stringify({ v: VERSION, ...payload }));
      return this.#key()
         .then((dataKey) => seal(payload, { dataKey, aad: this.#aad(key) }))
         .then((sealed) => this.#store().write(ENTRY + key, JSON.stringify({ v: VERSION, sealed })));
   }

   delete(key) {
      return this.#store().remove(ENTRY + key);
   }

   keys() {
      return andThen(this.#store().ids(), (ids) => ids.filter((id) => id.startsWith(ENTRY)).map((id) => id.slice(ENTRY.length)));
   }

   clear() {
      this.#dataKey = undefined;
      const store = this.#store();
      return andThen(store.ids(), (ids) => {
         const removed = ids.map((id) => store.remove(id));
         return removed.some((result) => result instanceof Promise)? Promise.all(removed).then(() => undefined) : undefined;
      });
   }

   async mirror(table, key, { delay = 500, ttl, revive, errorCallback = (error) => console.error('storageExtra mirror', key, error) } = {}) {
      /* DEV START */
      if(typeof table?.snapshot !== 'function' || typeof table.restore !== 'function' || typeof table.use !== 'function')
         throw new TypeError('storageExtra mirror needs an indexExtra table');
      if(!(Number.isFinite(delay) && delay >= 0))
         throw new RangeError('storageExtra mirror delay must be a number of milliseconds of 0 or more');
      /* DEV END */
      let saved;
      try {
         saved = await this.get(key);
      } catch(error) {
         errorCallback(error);
      }
      if(saved !== undefined) {
         try {
            table.restore(saved, { revive });
         } catch(error) {
            errorCallback(error);
            await Promise.resolve().then(() => this.delete(key)).catch(errorCallback);
         }
      }
      let timer;
      const save = () => {
         clearTimeout(timer);
         timer = setTimeout(() => {
            Promise.resolve().then(() => this.set(key, table.snapshot(), { ttl })).catch(errorCallback);
         }, delay);
      };
      const stop = table.use({
         upsert: ({ source }) => {
            if(source !== 'restore')
               save();
         },
         delete: save,
      });
      return () => {
         clearTimeout(timer);
         stop();
      };
   }

   #store() {
      return this.#backend ??= backendOf(this.#options.backend, this.#options.name);
   }

   #aad(key) {
      return `${this.#options.encrypt.aad ?? ''}\u0000${this.#options.name}\u0000${key}`;
   }

   #key() {
      return this.#dataKey ??= this.#openKey().catch((error) => {
         this.#dataKey = undefined;
         throw error;
      });
   }

   async #openKey() {
      const { publicKeys, privateKeys, aad } = this.#options.encrypt;
      const keyAad = `${aad ?? ''}\u0000${this.#options.name}`;
      const stored = await this.#store().read(DATA_KEY);
      if(stored !== undefined)
         return unsealDataKey(stored, { privateKeys, aad: keyAad });
      const { key, sealed } = await sealDataKey({ publicKeys, aad: keyAad });
      await this.#store().write(DATA_KEY, sealed);
      return key;
   }

   #open(key, text) {
      if(this.#options.encrypt)
         return this.#openSealed(key, text);
      const entry = parse(text);
      if(entry?.v !== VERSION || 'sealed' in entry)
         return this.#discard(key, 'is not a plaintext storageExtra entry');
      return this.#fresh(key, entry);
   }

   async #openSealed(key, text) {
      const entry = parse(text);
      if(entry?.v !== VERSION || typeof entry.sealed !== 'string')
         return this.#discard(key, 'is not an encrypted storageExtra entry');
      const dataKey = await this.#key();
      let payload;
      try {
         payload = await unseal(entry.sealed, { dataKey, aad: this.#aad(key) });
      } catch(error) {
         return this.#discard(key, 'could not be opened with this storage\'s data key', error);
      }
      return this.#fresh(key, payload);
   }

   #fresh(key, payload) {
      if(payload === null || typeof payload !== 'object' || !Number.isFinite(payload.at) || (payload.exp !== null && !Number.isFinite(payload.exp)))
         return this.#discard(key, 'is malformed');
      else if(payload.exp !== null && this.#options.now() > payload.exp)
         return andThen(this.delete(key), () => undefined);
      return payload.data;
   }

   #discard(key, problem, cause) {
      return andThen(this.delete(key), () => {
         throw new Error(`storageExtra entry ${key} ${problem}; it was removed`, cause === undefined? undefined : { cause });
      });
   }
}

export function storageExtra(options) {
   return new StorageExtra(options);
}
