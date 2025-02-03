if(!Object.prototype.flipIt) 
Object.defineProperty(Object.prototype, 'flipIt', { value: function() {
   if(this.constructor !== Object)
      throw new Error("flipIt can only be called by typeof 'object'");
   return Object.fromEntries(Object.entries(this).map(([key, value]) => [typeof value === 'object'? JSON.stringify(value) : value, key]))
}, writable:true});

if(!Object.prototype.flipItP)
Object.defineProperty(Object.prototype, 'flipItP', { value: function() {
   if(this.constructor !== Object)
      throw new Error("flipIt can only be called by typeof 'object'");
   return new Map(Object.entries(this).map((key, value) => [value, key]))
}, writable:true});