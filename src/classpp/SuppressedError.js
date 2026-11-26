import '../errorpp/index.js';

function messageOf(errors) {
   return errors.map((err) => err?.message ?? String(err)).join('\n\n');
}

export default class SuppressedError extends Error {
   constructor(...errors) {
      super(messageOf(errors));
      this.errorStack = errors.reverse();
      this.name = 'SuppressedError';
   }
   suppressed(err) {
      this.errorStack.push(err);
      this.message = messageOf(this.errorStack.slice().reverse());
      return this;
   }
   suppressedThrow(err) {
      throw this.suppressed(err);
   }
   handleTop() {
      return this.errorStack[this.errorStack.length-1];
   }
   topRecovered() {
      this.errorStack.pop();
      this.message = messageOf(this.errorStack.slice().reverse());
      return this;
   }
   isHandled() {
      return this.errorStack.length === 0;
   }
   throw() {
      if(!this.isHandled())
         throw this;
   }
   forEach(d0) {
      this.errorStack.slice().reverse().forEach(d0);
   }
   map(d0) {
      return this.errorStack.slice().reverse().map(d0);
   }
}
