
import { isPrototypeObject, ownSet } from '../../utilitypp/def/ownSet.js';

if(!Object.prototype.mapIt)
Object.defineProperty(Object.prototype, 'mapIt', { value: function(callback) {
   return Object.fromEntries(Object.entries(this).map(callback));
}, writable:true});

if(!Object.prototype.mapItIn)
Object.defineProperty(Object.prototype, 'mapItIn', { value: function(callback) {
   if(isPrototypeObject(this))
      throw new Error('mapItIn cannot be called on a prototype');
   else {
      for(const key of Object.keys(this))
         ownSet(this, key, callback([ key, this[key] ]));
      return this;
   }
}, writable:true});

if(!Object.prototype.reduceIt)
Object.defineProperty(Object.prototype, 'reduceIt', { value: function(callback, initialValue) {
   return arguments.length < 2? Object.entries(this).reduce(callback) : Object.entries(this).reduce(callback, initialValue);
}, writable:true});

if(!Object.prototype.filterIt)
Object.defineProperty(Object.prototype, 'filterIt', { value: function(callback) {
   return Object.fromEntries(Object.entries(this).filter(callback));
}, writable:true});