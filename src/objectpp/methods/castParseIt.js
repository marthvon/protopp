if(!Object.prototype.castParseIt) 
Object.defineProperty(Object.prototype, 'castParseIt', { value: function(parser) {
   if(!(this.constructor === Object || Array.isArray(this)))
      throw new Error('castParseIt can only be called by typeof pure object');
   for(const [ key, parse ] of Object.entries(parser))
      if(this.hasOwnProperty(key))
         this[key] = parse(this[key]);
}, writable:true});