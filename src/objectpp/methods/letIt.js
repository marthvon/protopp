const VoidRan = Object.freeze({returns: undefined});
function letVoid(value) {
   return value === undefined? VoidRan : value;
}

if(!Object.prototype.letz) 
Object.defineProperty(Object.prototype, 'letz', { value: function(run) {
   return letVoid(run(this.valueOf !== null? this.valueOf() : this));
}, writable:true});

if(!Object.prototype.lets) 
Object.defineProperty(Object.prototype, 'lets', { value: function(run) {
   if(this.valueOf !== null? this.valueOf() : this)
      return letVoid(run(this.valueOf !== null? this.valueOf() : this));
   return;
}, writable:true});

if(!Object.prototype.letx)
Object.defineProperty(Object.prototype, 'letx', { value: function(condition, run) {
   if(condition(this.valueOf !== null? this.valueOf() : this))
      return letVoid(run(this.valueOf !== null? this.valueOf() : this));
   return;
}, writable:true});