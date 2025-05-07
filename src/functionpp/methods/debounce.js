import '../static/isAsync.js';

if(!Function.prototype.debounce) 
Object.defineProperty(Function.prototype, 'debounce', { value: function(delta) {
   let lastCall = new Date(0).getTime();
   return (...args) => {
      const curr = new Date().getTime();
      const diff = lastCall - curr;
      if(diff > 0) {
         lastCall += delta;
         return new Promise((resolve) => 
            setTimeout(() => resolve(this(...args)), diff)
         );
      }
      lastCall = curr+delta;
      return this(...args);
   };
}, writable:true});