export default class Observable {
   observers = [];
   constructor(value) {
      this.val = value;
   }
   subscribe(callback) {
      this.observers.push(callback);
      return () => this.unsubscribe(callback);
   }
   unsubscribe(callback) {
      const index = this.observers.indexOf(callback);
      if(index !== -1)
         this.observers.splice(index, 1);
   }
   set value(newValue) {
      this.val = newValue instanceof Function? newValue(this.val) : newValue;
      for(const observer of this.observers.slice())
         observer(this.val);
   }
   get value() { return this.val; }
}
