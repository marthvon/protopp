import { ownSet } from '../../utilitypp/def/ownSet.js';

if(!Object.prototype.copyOnly) 
Object.defineProperty(Object.prototype, 'copyOnly', { value: function(...only) {
   /* DEV START */
   if(this.constructor !== Object)
      throw new Error("copyOnly can only be called by Object");
   /* DEV END */
   const ret = {};
   for(const o of only)
      ownSet(ret, o, this[o]);
   return ret;
}, writable:true});