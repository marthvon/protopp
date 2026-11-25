export default class Lru {
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
      return this.cache.get(key);
   }
   get(key) {
      if(!this.cache.has(key))
         return undefined;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
   }
   set(key, value) {
      if(this.cache.has(key))
         this.cache.delete(key);
      else if(this.cache.size === this.allocLimit) {
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
