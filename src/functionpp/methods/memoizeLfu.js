import Lfu from '../../classpp/Lfu.js';
import '../static/isAsync.js';
import { settlePending } from './settlePending.js';

if(!Function.prototype.memoizeLfu)
Object.defineProperty(Function.prototype, 'memoizeLfu', { value: function(allocLimit, onDealloc) {
   if(!Number.isInteger(allocLimit) || allocLimit < 2)
      throw new Error('Memoize cache allocLimit must be an integer greater than 1');
   const cache = new Lfu(allocLimit, onDealloc);
   return Function.isAsync(this) ? async (...args) => {
      const key = JSON.stringify(args);
      return cache.has(key)? cache.get(key) : settlePending(cache, key, this(...args));
   } : (...args) => {
      const key = JSON.stringify(args);
      return cache.has(key)? cache.get(key) : cache.set(key, this(...args));
   };
}, writable:true});
