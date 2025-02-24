import './deepCopy.js';

if(!Object.prototype.validateIt) 
Object.defineProperty(Object.prototype, 'validateIt', { value: function(rules, ...only) {
   if(only.length === 1)
      return rules[only].apply(this, [ this[only] ]);
   
   const validated = { ...this };
   const invalid = [];
   for(const key of only.length === 0? Object.keys(rules) : only) {
      const temp = rules[key].apply(this, [ this[key] ]);
      if(temp === undefined)
         continue; 
      delete validated[key];
      invalid.push([ key, temp ]);
   }
   return [ Object.fromEntries(invalid), validated ];
}, writable:true});