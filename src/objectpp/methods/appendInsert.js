if(!Object.prototype.appendInsert) 
Object.defineProperty(Object.prototype, 'appendInsert', { value: function(key, ...value) {
   if(this.hasOwnProperty(key))
      this[key].push(...value);
   else
      this[key] = value;
}, writable:true});