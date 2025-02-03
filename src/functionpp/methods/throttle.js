if(!Function.prototype.throttle)
Object.defineProperty(Function.prototype, 'throttle', { value: function(delta) {
   let lastCall = new Date(0).getTime();
   return (...args) => {
      const curr = new Date().getTime();
      if(lastCall >= curr)
         return;
      lastCall = curr+delta;
      return this(args);
   };
}, writable:true});