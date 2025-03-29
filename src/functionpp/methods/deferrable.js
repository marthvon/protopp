import '../../objectpp/methods/deepMerge.js';
import '../static/isAsync.js';

function finalizeDefers(deferQueue) {
   for(const defer of deferQueue)
      if(defer instanceof Function)
         defer();
      else if(defer.hasOwnProperty('finalizeIt'))
         defer.finalizeIt();
}

if(!Function.prototype.deferrable) 
Object.defineProperty(Function.prototype, 'deferrable', { value: function() {
   return Function.isAsync(this) ? async (...args) => {
      const deferQueue = [];
      try {
         const ret = await this.apply({
            set defer(defering) {
               deferQueue.push(defering)
            }
         }.deepMerge(this ?? {}), args);
         finalizeDefers(deferQueue);
         return ret;
      } catch(err) {
         finalizeDefers(deferQueue);
         throw err;
      }
   } : (...args) => {
      const deferQueue = [];
      try {
         const ret = this.apply({
            set defer(defering) {
               deferQueue.push(defering)
            }
         }.deepMerge(this ?? {}), args);
         finalizeDefers(deferQueue);
         return ret;
      } catch(err) {
         finalizeDefers(deferQueue);
         throw err;
      }
   };
}, writable:true});