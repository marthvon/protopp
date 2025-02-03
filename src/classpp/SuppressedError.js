import '../errorpp/index.js';

export default class SuppressedError extends Error {
   constructor(...errors) {
      super(errors.length === 0? ''
         : errors.reduce((res, err) => res + "\n\n" + err.message, '')
      );
      this.errorStack = errors;
      this.name = 'SuppressedError';
   }
   suppressed(err) {
      this.message = err.message + "\n\n" + this.message;
      this.errorStack.unshift(err);
      return this;
   }
   suppressedThrow(err) {
      this.message = err.message + "\n\n" + this.message;
      this.errorStack.unshift(err);
      throw this;
   }
   handleTop() {
      return this.errorStack[0];
   }
   topRecovered() {
      this.errorStack.shift();
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
      this.errorStack.forEach(d0);
   }
   map(d0) {
      return this.errorStack.map(d0);
   }
}