if(!Object.prototype.deepMerge) // edge case for circular reference
Object.defineProperty(Object.prototype, 'deepMerge', { value: function(...sources) {
   if(this.constructor !== Object)
      throw new Error("deepMerge can only be called by Object");
   for(const source of sources) {
      for(const key of Object.keys(source))
         if(
            this.hasOwnProperty(key) &&
            this[key] != null && source[key] != null &&
            this[key].constructor === Object && source[key].constructor === Object
         ) {
            this[key] = this[key].deepMerge(source[key]);
         } else
            this[key] = source[key];
   }
   return this;
}, writable:true});