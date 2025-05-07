import { letVoid } from "../../utilitypp/def/__letVoid.js";

if(!Object.prototype.letz) 
Object.defineProperty(Object.prototype, 'letz', { value: function(run) {
   return letVoid(run(this.valueOf !== null? this.valueOf() : this));
}, writable:true});

if(!Object.prototype.lets) 
Object.defineProperty(Object.prototype, 'lets', { value: function(run) {
   if(this?.valueOf? this.valueOf() : this)
      return letVoid(run(this.valueOf !== null? this.valueOf() : this));
   return;
}, writable:true});

if(!Object.prototype.letx)
Object.defineProperty(Object.prototype, 'letx', { value: function(condition, run) {
   if(condition(this?.valueOf? this.valueOf() : this))
      return letVoid(run(this.valueOf !== null? this.valueOf() : this));
   return;
}, writable:true});