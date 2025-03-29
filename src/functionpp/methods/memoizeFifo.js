import '../static/isAsync.js';

class Fifo {
   constructor(allocLimit, onDealloc) {
      this.cache = new Map();
      this.allocLimit = allocLimit
      if(onDealloc)
         this.onDealloc = onDealloc;
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

if(!Function.prototype.memoizeFifo)
Object.defineProperty(Function.prototype, 'memoizeFifo', { value: function(allocLimit, onDealloc) {
   if(allocLimit < 2)
      throw new Error('Memoize cache cannot have allocLimit less than or equal 1');
   const cache = new Fifo(allocLimit, onDealloc);
   return Function.isAsync(this) ? async (...args) => {
      const key = JSON.stringify(args);
      return cache.cache.has(key)? cache.cache.get(key) : cache.set(key, await this(...args));
   } : (...args) => {
      const key = JSON.stringify(args);
      return cache.cache.has(key)? cache.cache.get(key) : cache.set(key, this(...args));
   };
}, writable:true});