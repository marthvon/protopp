import TimeoutManager from '../classpp/TimeoutManager.js';
import { abortError } from '../utilitypp/def/abortError.js';

export class FetchError extends Error {
   constructor(response) {
      super(`${response.status} ${response.statusText ?? ''}`.trim());
      this.name = 'FetchError';
      this.status = response.status;
      this.response = response;
   }
}

class PromiseQueue {
   constructor() {
      this.queue = [];
      this.promise = new Promise((resolve, reject) => this.add({ resolve, reject }));
   }
   add(resolveAndReject) {
      this.queue.push(resolveAndReject);
   }
   resolve(value) {
      for(const { resolve } of this.queue)
         resolve(value);
      this.queue.length = 0;
      return value;
   }
   reject(error) {
      for(const { reject } of this.queue)
         reject(error);
      this.queue.length = 0;
      return error;
   }
}

function report(errorCallback, error, tries, isFetcher) {
   if(typeof errorCallback === 'function')
      errorCallback(error, tries, isFetcher);
   else if(typeof errorCallback === 'string')
      console.error(errorCallback, error);
}

function joinSlug(base, slug) {
   if(slug === undefined || slug === null)
      return base;
   const parts = (Array.isArray(slug)? slug : [ slug ]).map((part) => encodeURIComponent(String(part)));
   return `${base.replace(/\/+$/, '')}/${parts.join('/')}`;
}

function isFailedResponse(response) {
   return response !== null && typeof response === 'object' && typeof response.status === 'number' && response.ok === false;
}

function isRetryable(error) {
   const status = error?.status;
   return typeof status !== 'number' || status >= 500 || status === 408 || status === 429;
}

function describe({ url, slug, config, method } = {}, defaultUrl) {
   /* DEV START */
   if((url ?? defaultUrl) == undefined)
      throw new TypeError('fetchExtra needs a url or a defaultUrl');
   if(config?.signal !== undefined)
      throw new TypeError('fetchExtra takes its abort signal from fetchManager; create a child with fetchManager.create() to cancel one call');
   /* DEV END */
   const href = joinSlug(String(url ?? defaultUrl), slug);
   const settings = config ?? {};
   const verb = String(method ?? settings.method ?? 'GET').toUpperCase();
   const body = settings.body;
   return {
      url: href, slug, method: verb, config: settings,
      key: typeof body === 'string'? `${verb} ${href} ${body}` : `${verb} ${href}`,
      dedupable: body === undefined || body === null || typeof body === 'string',
   };
}

export class FetchExtra {
   #options;
   #timers;
   #inflight = new Map();
   #active = new Set();
   #failed = new WeakSet();

   constructor({
      fetchMethod = globalThis.fetch, defaultUrl,
      getter, setter,
      cacher, cleanFetcher, cleanCacher,
      retry = 0, retryDelay = 0, errorCallback,
      timeoutManager, fetchManager,
      waitFor, dedupe = true,
   } = {}) {
      /* DEV START */
      if(typeof fetchMethod !== 'function')
         throw new TypeError('fetchExtra needs a fetchMethod; this runtime has no global fetch');
      if(!Number.isInteger(retry) || retry < 0)
         throw new RangeError('fetchExtra retry must be an integer of 0 or more');
      if([ getter, setter, cleanFetcher, cleanCacher, waitFor ].some((hook) => hook !== undefined && typeof hook !== 'function'))
         throw new TypeError('fetchExtra getter, setter, cleanFetcher, cleanCacher, and waitFor must be functions');
      if(cacher !== undefined && typeof cacher !== 'function' && (typeof cacher?.get !== 'function' || typeof cacher.set !== 'function'))
         throw new TypeError('fetchExtra cacher must be a function, or a store with get and set such as a StorageExtra');
      /* DEV END */
      this.#options = { fetchMethod, defaultUrl, getter, setter, cacher, cleanFetcher, cleanCacher, retry, retryDelay, errorCallback, fetchManager, waitFor, dedupe };
      this.#timers = timeoutManager ?? new TimeoutManager();
   }

   fetch(options = {}, ...args) {
      const { getter, setter, dedupe, defaultUrl, fetchManager } = this.#options;
      const described = describe(options, defaultUrl);
      if(!options.force) {
         const held = getter?.(described);
         if(held !== undefined && !this.#failed.has(held))
            return held;
      }
      const key = dedupe && described.dedupable? described.key : undefined;
      if(key !== undefined && this.#inflight.has(key))
         return this.#inflight.get(key).promise;
      const cached = this.#usesCache(described) && !options.force? this.#readCache(described) : undefined;
      if(cached !== undefined && !(cached instanceof Promise)) {
         setter?.(cached, described, 'cache');
         return cached;
      }
      const queue = new PromiseQueue();
      const promise = queue.promise;
      const settle = () => {
         this.#active.delete(promise);
         if(key !== undefined && this.#inflight.get(key) === queue)
            this.#inflight.delete(key);
      };
      this.#active.add(promise);
      if(key !== undefined)
         this.#inflight.set(key, queue);
      promise.then(settle, () => {
         this.#failed.add(promise);
         settle();
      });
      this.#load(described, cached, fetchManager?.getSignal(), args).then((value) => queue.resolve(value), (error) => queue.reject(error));
      setter?.(promise, described, 'pending');
      return promise;
   }

   pending() {
      return this.#active.size? Promise.allSettled(Array.from(this.#active)).then(() => undefined) : undefined;
   }

   #usesCache(request) {
      const { cacher } = this.#options;
      return typeof cacher === 'function' || (cacher !== undefined && (request.method === 'GET' || request.method === 'HEAD'));
   }

   #readCache(request) {
      const { cacher, cleanCacher, errorCallback } = this.#options;
      try {
         const raw = typeof cacher === 'function'? cacher(request) : cacher.get(request.key);
         if(raw instanceof Promise)
            return raw.then((hit) => hit === undefined || !cleanCacher? hit : cleanCacher(hit, request));
         return raw === undefined || !cleanCacher? raw : cleanCacher(raw, request);
      } catch(error) {
         report(errorCallback, error, 0, false);
      }
   }

   async #send(request, signal, args) {
      const { fetchMethod, cleanFetcher, setter } = this.#options;
      if(signal?.aborted)
         throw abortError(signal);
      const response = await fetchMethod(request.url, { ...request.config, method: request.method, signal }, ...args);
      if(isFailedResponse(response))
         throw new FetchError(response);
      const value = cleanFetcher? await cleanFetcher(response, request) : response;
      setter?.(value, request, 'fetch');
      if(typeof this.#options.cacher?.set === 'function' && value !== undefined && this.#usesCache(request))
         this.#writeCache(request, value);
      return value;
   }

   #writeCache(request, value) {
      const { cacher, errorCallback } = this.#options;
      try {
         const written = cacher.set(request.key, value);
         if(written instanceof Promise)
            written.catch((error) => report(errorCallback, error, 0, false));
      } catch(error) {
         report(errorCallback, error, 0, false);
      }
   }

   async #load(request, cached, signal, args) {
      const { getter, setter, waitFor, retry, retryDelay, errorCallback } = this.#options;
      if(cached) {
         try {
            const value = await cached;
            if(value !== undefined) {
               setter?.(value, request, 'cache');
               return value;
            }
         } catch(error) {
            report(errorCallback, error, 0, false);
         }
      }
      if(waitFor) {
         try {
            await waitFor(request);
         } catch {}
         const held = getter?.(request);
         if(held !== undefined && !(held instanceof Promise))
            return held;
      }
      let tries = 0;
      const resend = () => this.#send(request, signal, args).catch((error) => {
         if(signal?.aborted || error?.name === 'AbortError')
            throw error;
         report(errorCallback, error, ++tries, true);
         if(tries > retry || !isRetryable(error))
            throw error;
         return this.#timers.delay(typeof retryDelay === 'function'? retryDelay(tries, error) : retryDelay, signal).then(resend);
      });
      return resend();
   }
}

export function fetchExtra(options) {
   return new FetchExtra(options);
}
