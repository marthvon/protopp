class FetchManager {
   controller = new AbortController();
   subcontrollers = new Set();
   create() {
      const temp = new FetchManager();
      this.subcontrollers.add(new WeakRef(temp));
      return temp;
   }
   destroy(manager) {
      this.subcontrollers.delete(manager);
   }
   abortion() {
      this.controller.abort();
      this.controller = new AbortController();
   }
   propagateAbortion() {
      this.abortion();
      for(const subcontroller of Array.from(this.subcontrollers)) {
         const sub = subcontroller.deref();
         if(sub)
            sub.propagateAbortion();
         else
            this.subcontrollers.delete(subcontroller);
      }
   }
   getSignal() {
      return this.controller.signal;
   }
}

export default fetchManager = new FetchManager();