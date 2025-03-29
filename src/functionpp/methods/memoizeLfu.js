import '../../arraypp/methods/removeValue.js';
import '../../arraypp/sorted_array/methods/searchSorted.js';
import '../static/isAsync.js';

class Lfu {
   constructor(allocLimit, onDealloc) {
      this.cache = new Map();
      this.lfu = {};
      this.allocLimit = allocLimit;
      if(onDealloc)
         this.onDealloc = onDealloc;
   }
   get(key) {
      const cacheRes = this.cache.get(key);
      if(this.lfu[cacheRes.freq].size === 1)
         delete this.lfu[cacheRes.freq];
      else
         this.lfu[cacheRes.freq].delete(cacheRes);
      cacheRes.freq++;
      if(this.lfu[cacheRes.freq])
         this.lfu[cacheRes.freq].add(cacheRes);
      else
         this.lfu[cacheRes.freq] = new Set([cacheRes]);
      return cacheRes.value;
   }
   set(key, value) {
      if(this.cache.size === this.allocLimit) {
         const minFreq = Object.keys(this.lfu)[0];
         const tempSet = this.lfu[minFreq];
         const temp = tempSet.values().next().value;
         this.cache.delete(temp.key);
         if(tempSet.size === 0)
            delete this.lfu[minFreq];
         else 
            tempSet.delete(temp);
         if(this.onDealloc) 
            this.onDealloc(temp.value);
      }
      this.cache.set(key, { key, value, freq: 1 });
      if(this.lfu.hasOwnProperty(1))
         this.lfu[1].add(this.cache.get(key));
      else
         this.lfu[1] = new Set([this.cache.get(key)]);
      return value;
   }
}

if(!Function.prototype.memoizeLfu) 
Object.defineProperty(Function.prototype, 'memoizeLfu', { value: function(allocLimit, onDealloc) {
   if(allocLimit < 2)
      throw new Error('Memoize cache cannot have allocLimit less than or equal 1');
   const cache = new Lfu(allocLimit, onDealloc);
   return Function.isAsync(this) ? async (...args) => {
      const key = JSON.stringify(args);
      return cache.cache.has(key)? cache.get(key) : cache.set(key, await this(...args));
   } : (...args) => {
      const key = JSON.stringify(args);
      return cache.cache.has(key)? cache.get(key) : cache.set(key, this(...args));
   };
}, writable:true});