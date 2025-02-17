if(!Object.prototype.validateIt) 
Object.defineProperty(Object.prototype, 'validateIt', { value: function(rules) {
   const validated = [];
   const invalid = [];
   for(const [ key, rule ] of Object.entries(rules)) {
      const temp = rule({ self: this, value: this[key] });
      if(temp)
         invalid.push([ key, temp ]);
      else
         validated.push([ key, this[key] ]);
   }
   return [ Object.fromEntries(invalid), Object.fromEntries(validated) ];
}, writable:true});