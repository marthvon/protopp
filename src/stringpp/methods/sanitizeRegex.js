if(!String.prototype.sanitizeRegex) 
Object.defineProperty(String.prototype, 'sanitizeRegex', { value: function() {
   return this.replace(/[!$(-/:=>?[-^{|}]/g, '\\$&');
}, writable:true});