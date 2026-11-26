import { ownSet } from '../../utilitypp/def/ownSet.js';

if(!Array.prototype.groupItBy)
Object.defineProperty(Array.prototype, 'groupItBy', { value: function(through) {
   const obj = {};
   for(const value of this) {
      const identifier = through(value);
      if(Object.hasOwn(obj, identifier))
         obj[identifier].push(value);
      else
         ownSet(obj, identifier, [ value ]);
   }
   return obj;
}, writable:true});

if(!Array.prototype.groupItByP)
Object.defineProperty(Array.prototype, 'groupItByP', { value: function(through) {
   const map = new Map();
   for(const value of this) {
      const identifier = through(value);
      if(map.has(identifier))
         map.get(identifier).push(value);
      else
         map.set(identifier, [ value ]);
   }
   return map;
}, writable:true});
