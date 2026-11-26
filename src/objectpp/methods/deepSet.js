import { isPrototypeObject, ownSet } from '../../utilitypp/def/ownSet.js';

if(!Object.prototype.deepSet) 
Object.defineProperty(Object.prototype, 'deepSet', { value: function(keys, value) {
   /* DEV START */
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepSet can only be called by Object or Array');
   /* DEV END */
   if(isPrototypeObject(this))
      throw new Error('deepSet cannot be called on a prototype');
   else
      ownSet(keys.slice(undefined, keys.length-1).reduce((res, key) => {
         if(res == null || !Object.hasOwn(res, key))
            throw new Error('deepSet cannot follow an inherited or missing key');
         else
            return res[key];
      }, this), keys[keys.length-1], value);
}, writable:true});

if(!Object.prototype.deepSetP) 
Object.defineProperty(Object.prototype, 'deepSetP', { value: function(keys, value) {
   /* DEV START */
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepSetP can only be called by Object or Array');
   /* DEV END */
   if(isPrototypeObject(this))
      throw new Error('deepSetP cannot be called on a prototype');
   else
      return ownSet(keys.slice(undefined, keys.length-1).reduce((res, key) => {
         if(!Object.hasOwn(res, key) || res[key] == null || !(
            res[key].constructor === Object || res[key].constructor === Array
         ))
            return ownSet(res, key, {});
         else
            return res[key];
      }, this), keys[keys.length-1], value);
}, writable:true});

if(!Object.prototype.deepGet) 
Object.defineProperty(Object.prototype, 'deepGet', { value: function(...keys) {
   /* DEV START */
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepGet can only be called by Object or Array');
   /* DEV END */
   return keys.reduce((res, key) => res[key], this);
}, writable:true});

if(!Object.prototype.deepGetP) 
Object.defineProperty(Object.prototype, 'deepGetP', { value: function(...keys) {
   /* DEV START */
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepGetP can only be called by Object or Array');
   /* DEV END */
   try {
      return keys.reduce((res, key) => res[key], this);
   } catch(_) {
      return undefined;
   }
}, writable:true});