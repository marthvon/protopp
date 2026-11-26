import { isPrototypeObject, ownSet } from '../../utilitypp/def/ownSet.js';

if(!Object.prototype.castParseIt) 
Object.defineProperty(Object.prototype, 'castParseIt', { value: function(parser) {
   /* DEV START */
   if(!(this.constructor === Object || Array.isArray(this)))
      throw new Error('castParseIt can only be called by typeof pure object');
   /* DEV END */
   if(isPrototypeObject(this))
      throw new Error('castParseIt cannot be called on a prototype');
   for(const [ key, parse ] of Object.entries(parser))
      if(Object.hasOwn(this, key))
         ownSet(this, key, parse(this[key]));
}, writable:true});