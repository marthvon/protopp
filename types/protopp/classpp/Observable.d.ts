export default class Observable<T> {
   private observers: Function[];
   private val: T;
   constructor(value: T);
   subscribe(callback : Function);
   unsubscribe(callback : Function);
   set(value : T|((value:T)=>T));
   get() : T;
}