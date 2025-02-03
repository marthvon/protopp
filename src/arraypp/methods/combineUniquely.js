if(!Array.prototype.combineUniquely) 
Object.defineProperty(Array.prototype, 'combineUniquely', { value: function(...arrs) {
   const res = new Set(this);
   arrs.forEach(arr => arr.forEach(val => res.add(val)));
   return Array.from(res);
}, writable:true});