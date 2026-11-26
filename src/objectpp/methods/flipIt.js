if(!Object.prototype.flipIt) 
Object.defineProperty(Object.prototype, 'flipIt', { value: function() {
   /* DEV START */
   if(!(this.constructor === Object || Array.isArray(this)))
      throw new Error("flipIt can only be called by typeof 'object'");
   /* DEV END */
   return Object.fromEntries(Object.entries(this).map(([key, value]) => [typeof value === 'object'? JSON.stringify(value) : value, key]))
}, writable:true});

if(!Object.prototype.flipItP)
Object.defineProperty(Object.prototype, 'flipItP', { value: function() {
   /* DEV START */
   if(!(this.constructor === Object || Array.isArray(this)))
      throw new Error("flipItP can only be called by typeof 'object'");
   /* DEV END */
   return new Map(Object.entries(this).map(([key, value]) => [value, key]))
}, writable:true});