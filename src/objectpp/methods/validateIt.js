if(!Object.prototype.validateIt) 
Object.defineProperty(Object.prototype, 'validateIt', { value: function(rules, ...only) {
   if(only.length === 1)
      return rules[only].apply(this, [ this[only] ]);
   
   const validated = [];
   const invalid = [];
   for(const key of only.length === 0? Object.keys(rules) : only) {
      const temp = rules[key].apply(this, [ this[key] ]);
      if(temp)
         invalid.push([ key, temp ]);
      else
         validated.push([ key, this[key] ]);
   }
   return [ Object.fromEntries(invalid), Object.fromEntries(validated) ];
}, writable:true});