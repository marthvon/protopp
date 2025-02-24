if(!Object.prototype.deepSet) 
Object.defineProperty(Object.prototype, 'deepSet', { value: function(keys, value) {
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepSet can only be called by Object or Array');
   keys.slice(undefined, keys.length-1).reduce((res, key) => res[key], this)[keys[keys.length-1]] = value;
}, writable:true});

if(!Object.prototype.deepSetP) 
Object.defineProperty(Object.prototype, 'deepSetP', { value: function(keys, value) {
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepSetP can only be called by Object or Array');
   return keys.slice(undefined, keys.length-1).reduce((res, key) => {
      if(!res.hasOwnProperty(key) || !(
         res[key].constructor === Object || res[key].constructor === Array
      )) 
         res[key] = {};
      return res[key];
   }, this)[keys[keys.length-1]] = value;
}, writable:true});

if(!Object.prototype.deepGet) 
Object.defineProperty(Object.prototype, 'deepGet', { value: function(...keys) {
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepSet can only be called by Object or Array');
   return keys.reduce((res, key) => res[key], this);
}, writable:true});

if(!Object.prototype.deepGetP) 
Object.defineProperty(Object.prototype, 'deepGetP', { value: function(...keys) {
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepSet can only be called by Object or Array');
   try {
      return keys.reduce((res, key) => res[key], this);
   } catch(_) {
      return undefined;
   }
}, writable:true});