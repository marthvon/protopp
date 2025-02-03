if(!Object.prototype.copyOnly) 
Object.defineProperty(Object.prototype, 'copyOnly', { value: function(...only) {
   if(this.constructor !== Object)
      throw new Error("copyOnly can only be called by Object");
   const ret = {};
   for(const o of only)
      ret[o] = this[o];
   return ret;
}, writable:true});