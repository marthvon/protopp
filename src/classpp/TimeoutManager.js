export class TimeoutManager {
   constructor() {
      this.heapTimeout = new Set();
   }
   setTimeout(callback, ms) {
      const id = setTimeout(() => {
         callback();
         this.heapTimeout.delete(id);
      }, ms);
      this.heapTimeout.add(id);
      return id;
   }
   clearTimeout(id) {
      if(!this.heapTimeout.has(id))
         return false;
      clearTimeout(id)
      this.heapTimeout.delete(id);
      return true;
   }
   flush() {
      this.heapTimeout.forEach((id) => clearTimeout(id));
      this.heapTimeout.clear();
   }
   async awaitRemaining() {
      while(this.heapTimeout.size) {
         const waitFor = Array.from(this.heapTimeout);
         for(const timeout of waitFor)
            await timeout;
      }
   }
}

export default timeoutManager = new TimeoutManager();