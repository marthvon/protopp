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
   const remember = [];
   const queue = [[ obj ]];
   const visited = new Set([ obj ]);
   while(queue.length > 0) {
      const [ curr, ...currKey ] = queue.shift();
      for(const key in curr)
         if(curr[key].constructor === Object || Array.isArray(curr[key])) {
            if(visited.has(curr[key]))
               continue;
            visited.add(curr[key]);
            queue.push([curr[key], ...currKey, key]);
         } else if(curr[key].hasOwnProperty('copyIt'))
            remember.push([curr[key].copyIt(), ...currKey, key]);
         else
            remember.push([curr[key], ...currKey, key]);
   }
   return remember;
}

if(!Object.prototype.deepCopyP) {
   Object.defineProperty(Object.prototype, 'deepCopyP', { value: function() {
      if(!(this.constructor === Object || Array.isArray(this)))
         throw new Error('deepSet can only be called by Object or Array');
      const res = this.deepCopy();
      rememberClassesInStructure(this).forEach(([value, ...keys]) => res.deepSet(keys, value));
      return res;
   }, writable:true});
}