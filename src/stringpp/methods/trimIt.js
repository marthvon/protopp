if(!String.prototype.trimIt) 
Object.defineProperty(String.prototype, 'trimIt', { value: function(char) {
   const escaped = char.sanitizeRegex();
   return String(this)
      .replace(new RegExp(`^(?:${escaped})+`), '')
      .replace(new RegExp(`(?:${escaped})+$`), '');
}, writable:true});