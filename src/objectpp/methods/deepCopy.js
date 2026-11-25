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

function isPlainContainer(value) {
   return value != null && (value.constructor === Object || Array.isArray(value));
}

function clonePlain(value, clones) {
   if(!isPlainContainer(value))
      return value;
   if(clones.has(value))
      return clones.get(value);
   const copy = Array.isArray(value) ? [] : {};
   clones.set(value, copy);
   for(const key of Object.keys(value))
      copy[key] = clonePlain(value[key], clones);
   return copy;
}

function rememberClassesInStructure(obj) {
   const remember = [];
   const queue = [[ obj ]];
   const visited = new Set([ obj ]);
   while(queue.length > 0) {
      const [ curr, ...currKey ] = queue.shift();
      for(const key of Object.keys(curr)) {
         const child = curr[key];
         if(isPlainContainer(child)) {
            if(visited.has(child))
               continue;
            visited.add(child);
            queue.push([child, ...currKey, key]);
         } else if(child != null && Object.prototype.hasOwnProperty.call(child, 'copyIt'))
            remember.push([child.copyIt(), ...currKey, key]);
         else if(child != null && typeof child === 'object')
            remember.push([child, ...currKey, key]);
      }
   }
   return remember;
}

if(!Object.prototype.deepCopyP) {
   Object.defineProperty(Object.prototype, 'deepCopyP', { value: function() {
      if(!(this.constructor === Object || Array.isArray(this)))
         throw new Error('deepSet can only be called by Object or Array');
      const res = clonePlain(this, new WeakMap());
      rememberClassesInStructure(this).forEach(([value, ...keys]) => res.deepSet(keys, value));
      return res;
   }, writable:true});
}