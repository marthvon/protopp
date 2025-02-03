if(!String.prototype.indexOfAll) 
Object.defineProperty(String.prototype, 'indexOfAll', { value: function(searchString) {
   return [...this.matchAll(new RegExp(searchString.sanitizeRegex(), 'g'))].map(result => result.index);
}, writable:true});