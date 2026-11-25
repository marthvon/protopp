export default class Fifo {
   constructor(allocLimit, onDealloc) {
      if(!Number.isInteger(allocLimit) || allocLimit < 1)
         throw new Error('Cache allocLimit must be an integer greater than or equal to 1');
      this.cache = new Map();
      this.allocLimit = allocLimit;
      if(onDealloc)
         this.onDealloc = onDealloc;
   }
   has(key) {
      return this.cache.has(key);
   }
   peek(key) {
      return this.get(key);
   }
   get(key) {
      return this.cache.get(key);
   }
   set(key, value) {
      if(!this.cache.has(key) && this.cache.size === this.allocLimit) {
         const evictKey = this.cache.keys().next().value;
         const evictValue = this.cache.get(evictKey);
         this.cache.delete(evictKey);
         if(this.onDealloc)
            this.onDealloc(evictValue, evictKey);
      }
      this.cache.set(key, value);
      return value;
   }
   delete(key) {
      return this.cache.delete(key);
   }
}
