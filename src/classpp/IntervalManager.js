export class IntervalManager {
   constructor() {
      this.heapInterval = new Set();
   }
   setInterval(callback, ms) {
      const id = setInterval(callback, ms);
      this.heapInterval.add(id);
      return id;
   }
   clearInterval(id) {
      if(!this.heapInterval.has(id))
         return false;
      clearInterval(id)
      this.heapInterval.delete(id);
      return true;
   }
   flush() {
      this.heapInterval.forEach((id) => clearInterval(id));
      this.heapInterval.clear();
   }
   async awaitRemaining() {
      while(this.heapInterval.size) {
         const waitFor = Array.from(this.heapInterval);
         for(const interval of waitFor)
            await interval;
      }
   }
}

export default intervalManager = new IntervalManager();