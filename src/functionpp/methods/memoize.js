if(!Function.prototype.memoize)
Object.defineProperty(Function.prototype, 'memoize', { value: function() {
   const cache = new Map();
   return (...args) => {
      const key = JSON.stringify(args);
      const cacheRes = cache.get(key);
      if(cacheRes !== undefined)
         return cacheRes;
      const res = this(args);
      cache.set(key, res);
      return res;
   };
}, writable:true});