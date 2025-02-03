if(!Function.prototype.memoizeLru) 
Object.defineProperty(Function.prototype, 'memoizeLru', { value: function(allocLimit, onDealloc) {
   if(allocLimit < 2)
      throw new Error('Memoize cache cannot have allocLimit less than or equal 1');
   const cache = new Map();
   return (...args) => {
      const key = JSON.stringify(args);
      const cacheRes = cache.get(key);
      if(cacheRes !== undefined) {
         cache.delete(key);
         cache.set(key, cacheRes);
         return cacheRes;
      }
      const res = this(args);
      if(cache.size === allocLimit) {
         const temp = cache.keys().next().value;
         cache.delete(temp);
         if(onDealloc) onDealloc(temp);
      }
      cache.set(key, res);
      return res;
   };
}, writable:true});