import { letVoid } from '../../utilitypp/def/__letVoid.js';
import '../static/isAsync.js';
if(!Function.prototype.throttle)
Object.defineProperty(Function.prototype, 'throttle', { value: function(delta) {
   let lastCall = new Date(0).getTime();
   return Function.isAsync(this) ? async (...args) => {
      const curr = new Date().getTime();
      if(lastCall >= curr)
         return;
      lastCall = curr+delta;
      return letVoid(await this(...args));
   } : (...args) => {
      const curr = new Date().getTime();
      if(lastCall >= curr)
         return;
      lastCall = curr+delta;
      return letVoid(this(...args));
   };
}, writable:true});