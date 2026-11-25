import { letVoid } from "../../utilitypp/def/__letVoid.js";

if(!Object.prototype.letz)
Object.defineProperty(Object.prototype, 'letz', { value: function(run) {
   return letVoid(run(typeof this.valueOf === 'function'? this.valueOf() : this));
}, writable:true});

if(!Object.prototype.lets)
Object.defineProperty(Object.prototype, 'lets', { value: function(run) {
   const it = typeof this.valueOf === 'function'? this.valueOf() : this;
   return it? letVoid(run(it)) : undefined;
}, writable:true});

if(!Object.prototype.letx)
Object.defineProperty(Object.prototype, 'letx', { value: function(condition, run) {
   const it = typeof this.valueOf === 'function'? this.valueOf() : this;
   return it? letVoid(run(it)) : undefined;
}, writable:true});