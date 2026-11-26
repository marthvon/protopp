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

function isThenable(value) {
   return value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
}

function isFailedResponse(response) {
   return response !== null && typeof response === 'object' && typeof response.status === 'number' && response.ok === false;
}

function retryable(error) {
   const status = error?.status;
   return typeof status !== 'number' || status >= 500 || status === 408 || status === 429;
}

function joinSlug(base, slug) {
   if(slug === undefined || slug === null)
      return base;
   const parts = (Array.isArray(slug)? slug : [ slug ]).map((part) => encodeURIComponent(String(part)));
   return `${base.replace(/\/+$/, '')}/${parts.join('/')}`;
}

function combineSignals(signals) {
   const list = signals.filter(Boolean);
   if(list.length <= 1)
      return list[0];
   else if(typeof AbortSignal.any === 'function')
      return AbortSignal.any(list);
   const controller = new AbortController();
   for(const signal of list) {
      if(signal.aborted) {
         controller.abort(signal.reason);
         break;
      }
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true, signal: controller.signal });
   }
   return controller.signal;
}

export function fetchExtra({
   fetchMethod = globalThis.fetch, defaultUrl,
   getter, setter,
   cacher, cleanFetcher, cleanCacher,
   retry = 0, retryDelay = 0, errorCallback,
   timeoutManager, fetchManager,
   waitFor, dedupe = true,
} = {}) {
   if(typeof fetchMethod !== 'function')
      throw new TypeError('fetchExtra needs a fetchMethod; this runtime has no global fetch');
   else if(!Number.isInteger(retry) || retry < 0)
      throw new RangeError('fetchExtra retry must be an integer of 0 or more');
   for(const [ name, value ] of Object.entries({ getter, setter, cacher, cleanFetcher, cleanCacher, waitFor }))
      if(value !== undefined && typeof value !== 'function')
         throw new TypeError(`fetchExtra ${name} must be a function`);
   const timers = timeoutManager ?? new TimeoutManager();
   const inflight = new Map();
   const active = new Set();
   const failed = new WeakSet();

   function report(error, tries, isFetcher) {
      if(typeof errorCallback === 'function')
         errorCallback(error, tries, isFetcher);
      else if(typeof errorCallback === 'string')
         console.error(errorCallback, error);
   }

   function describe({ url, slug, config, method } = {}) {
      const base = url ?? defaultUrl;
      if(base === undefined || base === null)
         throw new TypeError('fetchExtra needs a url or a defaultUrl');
      const href = joinSlug(String(base), slug);
      const settings = config ?? {};
      const verb = String(method ?? settings.method ?? 'GET').toUpperCase();
      const body = settings.body;
      return {
         url: href, slug, method: verb, config: settings,
         key: typeof body === 'string'? `${verb} ${href} ${body}` : `${verb} ${href}`,
         dedupable: body === undefined || body === null || typeof body === 'string',
      };
   }

   async function load(request, cached, signal, args) {
      if(cached) {
         try {
            const value = await cached;
            if(value !== undefined) {
               setter?.(value, request, 'cache');
               return value;
            }
         } catch(error) {
            report(error, 0, false);
         }
      }
      if(waitFor) {
         try {
            await waitFor(request);
         } catch {}
         const held = getter?.(request);
         if(held !== undefined && !isThenable(held))
            return held;
      }
      for(let tries = 1; ; ++tries) {
         if(signal?.aborted)
            throw abortError(signal);
         try {
            const response = await fetchMethod(request.url, { ...request.config, method: request.method, signal }, ...args);
            if(isFailedResponse(response))
               throw new FetchError(response);
            const value = cleanFetcher? await cleanFetcher(response, request) : response;
            setter?.(value, request, 'fetch');
            return value;
         } catch(error) {
            if(signal?.aborted || error?.name === 'AbortError')
               throw error;
            report(error, tries, true);
            if(tries > retry || !retryable(error))
               throw error;
            await timers.delay(typeof retryDelay === 'function'? retryDelay(tries, error) : retryDelay, signal);
         }
      }
   }

   function readCache(request) {
      let raw;
      try {
         raw = cacher(request);
         if(isThenable(raw))
            return { pending: Promise.resolve(raw).then((hit) => hit === undefined || !cleanCacher? hit : cleanCacher(hit, request)) };
         else if(raw === undefined)
            return null;
         const value = cleanCacher? cleanCacher(raw, request) : raw;
         return isThenable(value)? { pending: Promise.resolve(value) } : { value };
      } catch(error) {
         report(error, 0, false);
         return null;
      }
   }

   function request(options = {}, ...args) {
      const described = describe(options);
      if(!options.force) {
         const held = getter?.(described);
         if(held !== undefined && !failed.has(held))
            return held;
      }
      const key = dedupe && described.dedupable? described.key : undefined;
      if(key !== undefined && inflight.has(key))
         return inflight.get(key);
      const cached = cacher && !options.force? readCache(described) : null;
      if(cached && 'value' in cached) {
         setter?.(cached.value, described, 'cache');
         return cached.value;
      }
      const signal = combineSignals([ fetchManager?.getSignal(), described.config.signal ]);
      const promise = load(described, cached?.pending, signal, args);
      active.add(promise);
      if(key !== undefined)
         inflight.set(key, promise);
      const settle = () => {
         active.delete(promise);
         if(key !== undefined && inflight.get(key) === promise)
            inflight.delete(key);
      };
      promise.then(settle, () => {
         failed.add(promise);
         settle();
      });
      setter?.(promise, described, 'pending');
      return promise;
   }

   request.pending = () => active.size? Promise.allSettled(Array.from(active)).then(() => undefined) : undefined;
   return request;
}
