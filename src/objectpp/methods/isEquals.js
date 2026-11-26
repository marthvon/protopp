import '../../utilitypp/def/truthTable.js';
import '../../utilitypp/def/isClass.js';
import '../../utilitypp/def/nullCoalesce.js';
import '../../numberpp/methods/precisionpp.js';

if(!Object.prototype.isEquals)
Object.defineProperty(Object.prototype, 'isEquals', { value: function(other) {
   /* DEV START */
   if(
      !(this.constructor === Object || this.constructor === Array) || 
      !(other.constructor === Object || other.constructor === Array)
   )
      throw new Error("isEquals only compares between two Objects");
   /* DEV END */
   return JSON.stringify(this) === JSON.stringify(other);
}, writable:true});

if(!Object.prototype.isEqualsP)
Object.defineProperty(Object.prototype, 'isEqualsP', { value: function(other) {
   if(this == other)
      return true;
   if(other == null)
      return false;
   switch(truthTable(Array.isArray(this), Array.isArray(other))) {
      case 0b00:
         /* DEV START */
         if(this.constructor !== Object || other.constructor !== Object)
            throw new Error("isEqualsP only compares between two Objects");
         /* DEV END */
      case 0b11:
         break;
      default:
         return false;
   }
   const keysList = Object.keys(this);
   if(keysList.length !== Object.keys(other).length)
      return false;
   for(const keys of keysList) {
      if(!other.hasOwnProperty(keys))
         return false;
      if(this[keys] === null || other[keys] === null) {
         if(this[keys] !== other[keys])
            return false;
      } else if(typeof this[keys] === 'object') {
         if(!(typeof other[keys] === 'object' && this[keys].isEqualsP(other[keys])))
            return false;
      } else if((typeof this[keys] === "number" || this[keys] instanceof Number || (this[keys] != null && this[keys].isEquals && this[keys].isEquals !== Object.prototype.isEquals))?
         (!this[keys].isEquals(other[keys]))
         : (this[keys] !== other[keys])
      ) return false;
   }
   return true;
}, writable:true});