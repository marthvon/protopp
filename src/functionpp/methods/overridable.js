import '../static/isAsync.js';

if(!Function.prototype.overridable)
Object.defineProperty(Function.prototype, 'overridable', { value: function(cacheLimit, delta) {
   if(!Number.isInteger(cacheLimit) || cacheLimit < 1)
      throw new Error('overridable cacheLimit must be an integer greater than or equal to 1');
   const fn = this;
   const queue = [];
   let pushPtr = 0, pollPtr = 0, size = 0;
   let lastCall = new Date(0).getTime();
   let timer = null;
   function poll() {
      const res = queue[pollPtr];
      delete queue[pollPtr];
      pollPtr = (pollPtr + 1) % cacheLimit;
      size--;
      return res;
   }
   function drain() {
      timer = null;
      const { resolve, reject, args } = poll();
      try {
         resolve(fn.apply(fn, args));
      } catch(err) {
         reject(err);
      }
      if(size)
         timer = setTimeout(drain, delta);
      else
         lastCall = new Date().getTime() - delta;
   }
   function enqueue(resolve, reject, args) {
      if(size === cacheLimit)
         poll().reject('call-overriden');
      queue[pushPtr] = { resolve, reject, args };
      pushPtr = (pushPtr + 1) % cacheLimit;
      size++;
      if(!timer)
         timer = setTimeout(drain, Math.max(lastCall - new Date().getTime(), 0));
   }
   return Function.isAsync(fn) ? async (...args) => {
      const curr = new Date().getTime();
      if(size > 0 || lastCall - curr > 0) {
         return new Promise((resolve, reject) => enqueue(resolve, reject, args));
      } else {
         lastCall = curr + delta;
         return this(...args);
      }
   } : (...args) => {
      const curr = new Date().getTime();
      if(size > 0 || lastCall - curr > 0) {
         return new Promise((resolve, reject) => enqueue(resolve, reject, args));
      } else {
         lastCall = curr + delta;
         return this(...args);
      }
   };
}, writable:true});
