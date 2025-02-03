import SuppressedError from "../classpp/SuppressedError";

if(!Error.prototype.suppressedThrow) 
Object.defineProperty(Error.prototype, 'suppressedThrow', { value: function(error) {
   throw new SuppressedError(error, this);
}, writable:true});

if(!Error.prototype.safeCatch) 
Object.defineProperty(Error.prototype, 'safeCatch', { value: function(callback) {
   try {
      callback();
   } catch(error) {
      throw new SuppressedError(error, this);  
   }
}, writable:true});