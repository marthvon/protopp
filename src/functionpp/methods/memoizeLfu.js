import '../../arraypp/methods/removeValue.js';
import '../../arraypp/sorted_array/methods/searchSorted.js';

if(!Function.prototype.memoizeLfu) 
Object.defineProperty(Function.prototype, 'memoizeLfu', { value: function(allocLimit, onDealloc) {
   if(allocLimit < 2)
      throw new Error('Memoize cache cannot have allocLimit less than or equal 1');
   const cache = new Map();
   const lfu = [];
   return (...args) => {
      const key = JSON.stringify(args);
      const cacheRes = cache.get(key);
      if(cacheRes !== undefined) {
         const oldIdx = lfu.searchSorted((other) => other.freq - cacheRes.freq);
         if(lfu[oldIdx].cache.length === 1)
            lfu.splice(oldIdx, 1);
         else
            lfu[oldIdx].cache.splice(lfu[oldIdx].cache.indexOf(cacheRes), 1);

         cacheRes.freq++;
         const newIdx = lfu.searchSorted((other) => other.freq - cacheRes.freq);
         if(newIdx < 0)
            lfu.splice(-newIdx-1, 0, {
               freq: cacheRes.freq, 
               cache: [ cacheRes ]
            });
         else
            lfu[newIdx].cache.push(cacheRes);
         return cacheRes.value;
      }
      const res = this(args);
      if(cache.size === allocLimit) {
         const temp = lfu[0].cache.shift();
         cache.delete(temp.key);
         if(onDealloc) onDealloc(temp.value);
         if(lfu[0].cache.length === 0)
            lfu.splice(0, 1);
      }
      cache.set(key, { key: key, value: res, freq: 1 });
      if(lfu.length === 0 || lfu[0].freq !== 1)
         lfu.unshift({
            freq: 1, 
            cache: [ cache.get(key) ]
         });
      else
         lfu[0].cache.push(cache.get(key));
      return res;
   };
}, writable:true});