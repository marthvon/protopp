import { isPrototypeObject, ownSet } from '../../utilitypp/def/ownSet.js';

if(!Object.prototype.appendInsert) 
Object.defineProperty(Object.prototype, 'appendInsert', { value: function(key, ...value) {
   if(isPrototypeObject(this))
      throw new Error('appendInsert cannot be called on a prototype');
   else if(Object.hasOwn(this, key))
      this[key].push(...value);
   else
      ownSet(this, key, value);
}, writable:true});