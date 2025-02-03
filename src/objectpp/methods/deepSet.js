if(!Object.prototype.deepSet) 
Object.defineProperty(Object.prototype, 'deepSet', { value: function(value, ...keys) {
   if(!(this.constructor === Object || this.constructor === Array))
      throw new Error('deepSet can only be called by Object or Array');
   keys.slice(undefined, keys.length-1).reduce((res, key) => res[key], this)[keys[keys.length-1]] = value;
}, writable:true});