import SuppressedError from '../../classpp/SuppressedError.js';
import '../static/isAsync.js';

function contextWithDefer(base, deferQueue) {
   return new Proxy(base ?? {}, {
      set(target, prop, value, receiver) {
         if(prop === 'defer') {
            deferQueue.push(value);
            return true;
         } else {
            return Reflect.set(target, prop, value, receiver);
         }
      }
   });
}

function finalizeDefers(deferQueue) {
   let failure = null;
   for(const defer of deferQueue) {
      try {
         if(defer instanceof Function)
            defer();
         else if(defer && Object.prototype.hasOwnProperty.call(defer, 'finalizeIt'))
            defer.finalizeIt();
      } catch(err) {
         if(failure instanceof SuppressedError)
            failure.suppressed(err);
         else if(failure)
            failure = new SuppressedError(failure, err);
         else
            failure = err;
      }
   }
   if(failure)
      throw failure;
}

function finish(deferQueue, failed, failure, ret) {
   try {
      finalizeDefers(deferQueue);
   } catch(deferErr) {
      if(!failed)
         throw deferErr;
      else {
         const callErrors = failure instanceof SuppressedError ? failure.errorStack.slice().reverse() : [failure];
         const deferErrors = deferErr instanceof SuppressedError ? deferErr.errorStack.slice().reverse() : [deferErr];
         throw new SuppressedError(...callErrors, ...deferErrors);
      }
   }
   if(failed)
      throw failure;
   else
      return ret;
}

function settle(self, receiver, args) {
   const deferQueue = [];
   let ret, failed = false, failure;
   try {
      ret = self.apply(contextWithDefer(receiver, deferQueue), args);
   } catch(err) {
      failed = true;
      failure = err;
   }
   return finish(deferQueue, failed, failure, ret);
}

async function settleAsync(self, receiver, args) {
   const deferQueue = [];
   let ret, failed = false, failure;
   try {
      ret = await self.apply(contextWithDefer(receiver, deferQueue), args);
   } catch(err) {
      failed = true;
      failure = err;
   }
   return finish(deferQueue, failed, failure, ret);
}

if(!Function.prototype.deferrable)
Object.defineProperty(Function.prototype, 'deferrable', { value: function() {
   const self = this;
   return Function.isAsync(this) ? async function(...args) {
      return settleAsync(self, this, args);
   } : function(...args) {
      return settle(self, this, args);
   };
}, writable:true});
