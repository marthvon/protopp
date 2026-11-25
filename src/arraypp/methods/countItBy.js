if(!Array.prototype.countItBy) 
Object.defineProperty(Array.prototype, 'countItBy', { value: function() {
   const obj = Object.create(null);
   for(const value of this)
      if(Object.hasOwn(obj, value))
         obj[value]++;
      else
         obj[value] = 1;
   return obj;
}, writable:true});

if(!Array.prototype.countItByP) 
Object.defineProperty(Array.prototype, 'countItByP', { value: function() {
   const map = new Map();
   for(const value of this)
      map.set(value, map.has(value)? (map.get(value)+1):1);
   return map;
}, writable:true});