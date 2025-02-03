if(!String.prototype.charAdd) 
Object.defineProperty(String.prototype, 'charAdd', { value: function(value, index=0) {
   return String.fromCharCode(this.charCodeAt(index)+value);
}, writable:true});