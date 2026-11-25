function addFreq(cache, node) {
   if(cache.freqs.has(node.freq))
      cache.freqs.get(node.freq).add(node);
   else
      cache.freqs.set(node.freq, new Set([node]));
}

function removeFreq(cache, node) {
   const bucket = cache.freqs.get(node.freq);
   if(bucket.size === 1)
      cache.freqs.delete(node.freq);
   else
      bucket.delete(node);
}

function bumpMin(cache) {
   if(!cache.freqs.has(cache.minFreq))
      cache.minFreq = cache.freqs.size ? Math.min(...cache.freqs.keys()) : 0;
}

function touch(cache, node) {
   removeFreq(cache, node);
   node.freq++;
   addFreq(cache, node);
   bumpMin(cache);
}

export default class Lfu {
   constructor(allocLimit, onDealloc) {
      if(!Number.isInteger(allocLimit) || allocLimit < 1)
         throw new Error('Cache allocLimit must be an integer greater than or equal to 1');
      this.cache = new Map();
      this.freqs = new Map();
      this.minFreq = 0;
      this.allocLimit = allocLimit;
      if(onDealloc)
         this.onDealloc = onDealloc;
   }
   has(key) {
      return this.cache.has(key);
   }
   peek(key) {
      if(this.cache.has(key))
         return this.cache.get(key).value;
      else
         return undefined;
   }
   get(key) {
      if(!this.cache.has(key))
         return undefined;
      const node = this.cache.get(key);
      touch(this, node);
      return node.value;
   }
   set(key, value) {
      if(this.cache.has(key)) {
         const node = this.cache.get(key);
         node.value = value;
         touch(this, node);
      } else {
         if(this.cache.size === this.allocLimit) {
            const node = this.freqs.get(this.minFreq).values().next().value;
            this.cache.delete(node.key);
            removeFreq(this, node);
            bumpMin(this);
            if(this.onDealloc)
               this.onDealloc(node.value, node.key);
         }
         const node = { key, value, freq: 1 };
         this.cache.set(key, node);
         addFreq(this, node);
         this.minFreq = 1;
      }
      return value;
   }
   delete(key) {
      if(!this.cache.has(key))
         return false;
      const node = this.cache.get(key);
      this.cache.delete(key);
      removeFreq(this, node);
      bumpMin(this);
      return true;
   }
}
