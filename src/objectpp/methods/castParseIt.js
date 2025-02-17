if(!Object.prototype.castParseIt) 
Object.defineProperty(Object.prototype, 'castParseIt', { value: function(parser) {
   for(const [ key, parse ] of Object.entries(parser))
      if(this.hasOwnProperty(key))
         this[key] = parse(this[key]);
}, writable:true});