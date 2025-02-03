if(!Object.prototype.flatIt) // recursion bad, rewrite so no dead object/array are created (not used outside function except in this function) 
Object.defineProperty(Object.prototype, 'flatIt', { value: function(depth=1) {
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error(Array.isArray(this)? 
         'Use Array.flat (js native) for array object or Array.legacyFlat for older versions' :
         "flatIt can only be called by Object"
      );
   const res = [];
   (function recurse(dict, depth) {
      Object.entries(dict).forEach(([key, value]) => {
         if(depth === 0 || value === null || value === undefined || value.constructor !== Object) 
            res.push([key, value]); 
         else
            recurse(value, depth-1);
      });
   })(this, depth);
   return Object.fromEntries(res);
}, writable:true});