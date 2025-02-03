if(!Object.prototype.deepMerge)
Object.defineProperty(Object.prototype, 'deepMerge', { value: function(...sources) {
   if(this.constructor !== Object)
      throw new Error("deepMerge can only be called by Object");
   for(const source of sources)
      for (const key in source)
         if (
            this.hasOwnProperty(key) && 
            this[key].constructor === Object && source[key].constructor === Object
         ) {
            this[key] = this[key].deepMerge(source[key]);
         } else
            this[key] = source[key]; // re-think this, might be assigning by reference
   return this;
}, writable:true});