if(!Function.prototype.memoizeFifo)
Object.defineProperty(Function.prototype, 'memoizeFifo', { value: function(allocLimit, onDealloc) {
   if(allocLimit < 2)
      throw new Error('Memoize cache cannot have allocLimit less than or equal 1');
   const cache = new Map();
   return (...args) => {
      const key = JSON.stringify(args);
      const cacheRes = cache.get(key);
      if(cacheRes !== undefined)
         return cacheRes;
      if(cache.size === allocLimit) {
         const temp = cache.keys().next().value;
         cache.delete(temp);
         if(onDealloc) onDealloc(temp);
      }
      const res = this(args);
      cache.set(key, res);
      return res;
   };
}, writable:true});