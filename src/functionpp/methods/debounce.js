import '../static/isAsync.js';

if(!Function.prototype.debounce) 
Object.defineProperty(Function.prototype, 'debounce', { value: function(delta) {
   let lastCall = new Date(0).getTime();
   const __debounce = (output, args) => {
      const curr = new Date().getTime();
      const diff = lastCall - curr;
      if(diff > 0) {
         output.push(new Promise((resolve) => 
            setTimeout(() => resolve(this(...args)), diff)
         ));
         return lastCall+delta;
      }
      return curr+delta;
   }
   return Function.isAsync(this) ? async (...args) => {
      const output = []; lastCall = __debounce(output, args);
      if(output.length)
         return output[0];
      return await this(...args);
   } : (...args) => {
      const output = []; lastCall = __debounce(output, args);
      if(output.length)
         return output[0];
      return this(...args);
   };
}, writable:true});