export class FetchManager {
   constructor() {
      this.controller = new AbortController();
      this.subcontrollers = new Set();
      this.self = new WeakRef(this);
   }
   create() {
      const sub = new FetchManager();
      this.subcontrollers.add(sub.self);
      return sub;
   }
   destroy(manager) {
      if(!manager)
         return false;
      const tracked = this.subcontrollers.delete(manager.self);
      manager.propagateAbortion();
      return tracked;
   }
   abortion(reason) {
      this.controller.abort(reason);
      this.controller = new AbortController();
   }
   propagateAbortion(reason) {
      this.abortion(reason);
      for(const ref of Array.from(this.subcontrollers)) {
         const sub = ref.deref();
         if(sub)
            sub.propagateAbortion(reason);
         else
            this.subcontrollers.delete(ref);
      }
   }
   getSignal() {
      return this.controller.signal;
   }
}

export default FetchManager;
