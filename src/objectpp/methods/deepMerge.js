import { isPrototypeObject, ownSet } from '../../utilitypp/def/ownSet.js';

if(!Object.prototype.deepMerge) // edge case for circular reference
Object.defineProperty(Object.prototype, 'deepMerge', { value: function(...sources) {
   /* DEV START */
   if(this.constructor !== Object)
      throw new Error("deepMerge can only be called by Object");
   /* DEV END */
   if(isPrototypeObject(this))
      throw new Error('deepMerge cannot be called on a prototype');
   for(const source of sources) {
      for(const key of Object.keys(source))
         if(
            Object.hasOwn(this, key) &&
            this[key] != null && source[key] != null &&
            this[key].constructor === Object && source[key].constructor === Object
         )
            ownSet(this, key, this[key].deepMerge(source[key]));
         else
            ownSet(this, key, source[key]);
   }
   return this;
}, writable:true});