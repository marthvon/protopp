import '../static/isAsync.js';
import { settlePending } from './settlePending.js';
if(!Function.prototype.memoize)
Object.defineProperty(Function.prototype, 'memoize', { value: function() {
   const cache = new Map();
   return Function.isAsync(this) ? async (...args) => {
      const key = JSON.stringify(args);
      return cache.has(key)? cache.get(key) : settlePending(cache, key, this(...args));
   } : (...args) => {
      const key = JSON.stringify(args);
      if(cache.has(key))
         return cache.get(key);
      else {
         const value = this(...args);
         cache.set(key, value);
         return value;
      }
   };
}, writable:true});
