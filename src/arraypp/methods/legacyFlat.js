if(!Array.prototype.legacyFlat) {
   if(typeof Array.prototype.flat === 'function')
      Object.defineProperty(Array.prototype, 'legacyFlat', { value: function(depth=1) {
         return this.flat(depth);
      }, writable:true});
   else 
      Object.defineProperty(Array.prototype, 'legacyFlat', { value: function(depth=1) {
         const res = [];
         (function recurse(arrs, d) {
            for(const value of arrs)
               if(d !== 0 && Array.isArray(value))
                  recurse(value, d-1);
               else
                  res.push(value);
         })(this, depth);
         return res;
      }, writable:true});
}