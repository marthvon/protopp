if(!Function.prototype.overridable) // unfinished
Object.defineProperty(Function.prototype, 'overridable', { value: function(cacheLimit, delta) {
   let pushPtr = 0, pollPtr = 0;
   const queue = [];
   function poll() {
      const res = queue[pollPtr];
      delete queue[pollPtr];
      pollPtr = (pollPtr+1) % cacheLimit;
      return res;
   }
   function resolveQueue(diff) {
      return setTimeout(() => {
         const { resolve, args } = poll();
         resolve(this(...args)); // await
         if(pollPtr !== pushPtr)
            resolveQueue(delta);
         else
            lastCall = new Date().getTime() - delta;
      }, diff);
   }
   let lastCall = new Date(0).getTime();
   return (...args) => {
      const curr = new Date().getTime();
      const isQueueEmpty = pollPtr === pushPtr; 
      if(!isQueueEmpty || lastCall-curr > 0) {
         return new Promise((resolve, reject) => {
            queue[pushPtr] = { resolve, reject, args };
            pushPtr = pushPtr+1 % cacheLimit;
            if(pushPtr === pollPtr)
               poll().reject('call-overriden');
            if(isQueueEmpty)
               resolveQueue(lastCall-curr);
         });
      }
      lastCall = curr+delta;
      return this(...args);
   };
}, writable:true});