import '../static/isAsync.js';

if(!Function.prototype.debounce)
Object.defineProperty(Function.prototype, 'debounce', { value: function(delta) {
   let lastCall = new Date(0).getTime();
   return Function.isAsync(this) ? async (...args) => {
      const curr = new Date().getTime();
      const diff = lastCall - curr;
      if(diff > 0) {
         lastCall += delta;
         return new Promise((resolve, reject) => {
            setTimeout(() => {
               try {
                  resolve(this(...args));
               } catch(err) {
                  reject(err);
               }
            }, diff);
         });
      } else {
         lastCall = curr + delta;
         return this(...args);
      }
   } : (...args) => {
      const curr = new Date().getTime();
      const diff = lastCall - curr;
      if(diff > 0) {
         lastCall += delta;
         return new Promise((resolve, reject) => {
            setTimeout(() => {
               try {
                  resolve(this(...args));
               } catch(err) {
                  reject(err);
               }
            }, diff);
         });
      } else {
         lastCall = curr + delta;
         return this(...args);
      }
   };
}, writable:true});
