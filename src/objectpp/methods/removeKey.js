if(!Object.prototype.removeKey) 
Object.defineProperty(Object.prototype, 'removeKey', { value: function(...except) {
   /* DEV START */
   if(this.constructor !== Object)
      throw new Error("removeKey can only be called by Object");
   /* DEV END */
   for(const e of except)
      delete this[e];
   return this;
}, writable:true});