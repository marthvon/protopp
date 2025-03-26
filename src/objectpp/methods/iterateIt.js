

if(!Object.prototype.mapIt)
Object.defineProperty(Object.prototype, 'mapIt', { value: function(callback) {
   return Object.fromEntries(Object.entries(this).map(callback));
}, writable:true});

if(!Object.prototype.mapItIn)
Object.defineProperty(Object.prototype, 'mapItIn', { value: function(callback) {
   for(const key in this)
      this[key] = callback([ key, this[key] ]);
   return this;
}, writable:true});

if(!Object.prototype.reduceIt)
Object.defineProperty(Object.prototype, 'reduceIt', { value: function(callback) {
   return Object.fromEntries(Object.entries(this).reduce(callback));
}, writable:true});

if(!Object.prototype.filterIt)
Object.defineProperty(Object.prototype, 'filterIt', { value: function(callback) {
   return Object.fromEntries(Object.entries(this).filter(callback));
}, writable:true});