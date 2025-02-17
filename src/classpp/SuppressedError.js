import '../errorpp/index.js';

export default class SuppressedError extends Error {
   constructor(...errors) {
      super(errors.length === 0? ''
         : errors.reduce((res, err) => res + "\n\n" + err.message, '')
      );
      this.errorStack = errors.reverse();
      this.name = 'SuppressedError';
   }
   suppressed(err) {
      this.message = err.message + "\n\n" + this.message;
      this.errorStack.push(err);
      return this;
   }
   suppressedThrow(err) {
      this.message = err.message + "\n\n" + this.message;
      this.errorStack.push(err);
      throw this;
   }
   handleTop() {
      return this.errorStack[this.errorStack.length-1];
   }
   topRecovered() {
      this.errorStack.pop();
      this.message.replace(/^.*?\n{2}/, '');
   }
   isHandled() {
      return this.errorStack.length === 0;
   }
   throw() {
      if(!this.isHandled())
         throw this;
   }
   forEach(d0) {
      this.errorStack.reverse().forEach(d0);
   }
   map(d0) {
      return this.errorStack.reverse().map(d0);
   }
}