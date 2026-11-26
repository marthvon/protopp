export class IntervalManager {
   constructor() {
      this.heapInterval = new Set();
   }
   get size() {
      return this.heapInterval.size;
   }
   setInterval(callback, ms, ...args) {
      const id = setInterval(callback, ms, ...args);
      this.heapInterval.add(id);
      return id;
   }
   clearInterval(id) {
      if(!this.heapInterval.has(id))
         return false;
      clearInterval(id);
      this.heapInterval.delete(id);
      return true;
   }
   flush() {
      this.heapInterval.forEach((id) => clearInterval(id));
      this.heapInterval.clear();
   }
}

export default IntervalManager;
