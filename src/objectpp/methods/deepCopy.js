import '../../utilitypp/def/isClass.js';
import '../../utilitypp/def/isCustomClass.js';
import './deepSet.js';
// structuredClone() is supported in modern browsers and Node.js 17+
if(!Object.prototype.deepCopy) {
   if(typeof structuredClone === 'function')
      Object.defineProperty(Object.prototype, 'deepCopy', { value: function() {
         return structuredClone(this);
      }, writable:true});
   else
      Object.defineProperty(Object.prototype, 'deepCopy', { value: function() {
         return JSON.parse(JSON.stringify(this));
      }, writable:true});
}

function rememberClassesInStructure(obj) {
   const remember = [ ];
   const queue = [ [obj] ];
   while(queue.length > 0) {
      const [ curr, ...currKey ] = queue.shift();
      for(const key in curr)
         if(curr[key].constructor === Object || Array.isArray(curr[key]))
            queue.push([curr[key], ...currKey, key]);
         else if(isCustomClass(curr[key]) && curr[key].hasOwnProperty('copyIt'))
            remember.push([curr[key].copyIt(), ...currKey, key]);
         else if(isClass(curr[key]))
            remember.push([curr[key], ...currKey, key]);
   }
   return remember;
}

// update once jsonpp is implemented toJSON use to deserialize and parseExtra to serialize
// add that logic later
if(!Object.prototype.deepCopyP) {
   //if(typeof structuredClone === 'function')
   //   Object.defineProperty(Object.prototype, 'deepCopyP', { value: function() {
   //      if(!(this.constructor === Object || this.constructor === Array))
   //         throw new Error('deepSet can only be called by Object or Array');
   //      const res = structuredClone(this);
   //      rememberClassesInStructure(this).forEach(([value, ...keys]) => res.deepSet(value, ...keys));
   //      return res;
   //   }, writable:true});
   //else
   Object.defineProperty(Object.prototype, 'deepCopyP', { value: function() {
      if(!(this.constructor === Object || this.constructor === Array))
         throw new Error('deepSet can only be called by Object or Array');
      const res = JSON.parse(JSON.stringify(this));
      rememberClassesInStructure(this).forEach(([value, ...keys]) => res.deepSet(value, ...keys));
      return res;
   }, writable:true});
}