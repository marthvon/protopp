import '../static/isAsync.js';

class Lru {
   constructor(allocLimit, onDealloc) {
      this.cache = new Map();
      this.allocLimit = allocLimit;
      if(onDealloc)
         this.onDealloc = onDealloc;
   }
   get(key) {
      const cacheRes = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, cacheRes);
      return cacheRes;
   }
   set(key, value) {
      if(this.cache.size === this.allocLimit) {
         const temp = this.cache.keys().next().value;
         this.cache.delete(temp);
         if(this.onDealloc) 
            this.onDealloc(temp);
      }
      this.cache.set(key, value);
      return value;
   }
}

if(!Function.prototype.memoizeLru) 
Object.defineProperty(Function.prototype, 'memoizeLru', { value: function(allocLimit, onDealloc) {
   if(allocLimit < 2)
      throw new Error('Memoize cache cannot have allocLimit less than or equal 1');
   const cache = new Lru(allocLimit, onDealloc);
   return Function.isAsync(this) ? async (...args) => {
      const key = JSON.stringify(args);
      return cache.cache.has(key)? cache.get(key) : cache.set(key, await this(...args));
   } : (...args) => {
      const key = JSON.stringify(args);
      return cache.cache.has(key)? cache.get(key) : cache.set(key, this(...args));
   };
}, writable:true});