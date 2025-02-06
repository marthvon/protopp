import '../functionpp/static/isAsync.js';

class PromiseQueue {
   constructor() {
      this.queue = [];
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
      return error
   }
}

export function fetchExtra({
   fetchMethod=fetch, defaultUrl, 
   getter, setter, cacher, 
   retry, retryDelay, errorCallback,
   timeoutManager, fetchManager, 
   cleanFetcher, cleanCacher,
}) {
   const queue = new PromiseQueue();
   return ({ url, config }, ...args) => {
      const got = getter(); 
      if(got !== undefined)
         return got;
      else if(got instanceof Promise)
         return new Promise((resolve, reject) => {
            const temp = getter();
            if(temp === undefined)
               reject('Illegal state of getCsrfToken Promise awaiting a prior fetch Promise');
            else if(temp instanceof Promise)
               queue.add({ resolve, reject })
            else
               return temp;
         });

      let tries = 0;
      const fetchParams = [ url ?? defaultUrl, {
         ...(fetchManager? { signal: fetchManager.getSignal() } : {}),
         ...config
      }];
      if(args.length) 
         fetchParams.splice(1, 0, ...args);
      if(Function.isAsync(cacher))
         var cache = (() => cacher(...fetchParams, { timeoutManager, fetchManager }));
      else if(cacher) {
         const temp = cacher(...fetchParams);
         if(temp instanceof Promise)
            throw new Error('cacher returns Promise type despite not being async');
         if(temp !== undefined)
            return setter(temp);
      }
      return (function resend() { 
         const d0 = cache === undefined? 
            fetchMethod(...fetchParams).then((response) => queue.resolve(setter(cleanFetcher? cleanFetcher(response) : response)))
            : cache().then((response) => queue.resolve(setter(cleanCacher? cleanCacher(response) : response)));
         setter(d0.catch((error) => { ++tries;
               if(errorCallback instanceof Function) 
                  errorCallback(error, tries, cache === undefined);
               else if(typeof errorCallback === 'string')
                  console.error(error);
               if(retry === undefined || tries > retry) {
                  setter(undefined);
                  if(cache === undefined)
                     throw queue.reject(error); // add optional alternative
                  tries = 0;
                  cache = undefined;
               }
               return new Promise((resolve) => (timeoutManager? 
                  timeoutManager.setTimeout : setTimeout) ( 
                     () => resolve(resend()), retryDelay
                  )
               );
            })
         );
      })();
   }
}