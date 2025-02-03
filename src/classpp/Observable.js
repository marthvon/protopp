export default class Observable {
   observers = [];
   constructor(value) {
      this.val = value;
   }
   subscribe(callback) {
      this.observers.push(callback);
   }
   unsubscribe(callback) {
      this.observers.splice(this.observers.indexOf(callback), 1)
   }
   set value(newValue) {
      this.val = newValue instanceof Function? newValue(this.val) : newValue;
      for(const observer of this.observers)
         observer(this.val);
   }
   get value() { return this.val; }
}