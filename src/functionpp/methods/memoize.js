import '../static/isAsync.js';
if(!Function.prototype.memoize)
Object.defineProperty(Function.prototype, 'memoize', { value: function() {
   const cache = new Map();
   const setCache = (key, res) => {
      cache.set(key, res);
      return res;
   }
   return Function.isAsync(this) ? async (...args) => {
      const key = JSON.stringify(args);
      return cache.has(key)? cache.get(key) : setCache(key, await this(...args));
   } : (...args) => {
      const key = JSON.stringify(args);
      return cache.has(key)? cache.get(key) : setCache(key, this(...args));
   };
}, writable:true});