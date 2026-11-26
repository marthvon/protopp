import { abortError } from '../utilitypp/def/abortError.js';

function settleIdle(manager) {
   if(manager.timers.size === 0)
      for(const resolve of manager.idle.splice(0))
         resolve();
}

export class TimeoutManager {
   constructor() {
      this.timers = new Map();
      this.idle = [];
   }
   get size() {
      return this.timers.size;
   }
   setTimeout(callback, ms, ...args) {
      const id = setTimeout(() => {
         this.timers.delete(id);
         try {
            callback(...args);
         } finally {
            settleIdle(this);
         }
      }, ms);
      this.timers.set(id, null);
      return id;
   }
   clearTimeout(id) {
      if(!this.timers.has(id))
         return false;
      const onClear = this.timers.get(id);
      clearTimeout(id);
      this.timers.delete(id);
      if(onClear)
         onClear();
      settleIdle(this);
      return true;
   }
   delay(ms, signal) {
      return new Promise((resolve, reject) => {
         if(signal?.aborted)
            return reject(abortError(signal));
         const onAbort = () => this.clearTimeout(id);
         const id = this.setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
         }, ms);
         this.timers.set(id, () => {
            signal?.removeEventListener('abort', onAbort);
            reject(abortError(signal?.aborted? signal : undefined));
         });
         signal?.addEventListener('abort', onAbort, { once: true });
      });
   }
   flush() {
      for(const id of Array.from(this.timers.keys()))
         this.clearTimeout(id);
   }
   awaitRemaining() {
      if(this.timers.size === 0)
         return Promise.resolve();
      return new Promise((resolve) => this.idle.push(resolve));
   }
}

export default TimeoutManager;
