export default class Observable<T> {
   private observers: Array<(value: T) => void>;
   private val: T;
   constructor(value: T);
   subscribe(callback: (value: T) => void): () => void;
   unsubscribe(callback: (value: T) => void): void;
   get value(): T;
   set value(value: T | ((previous: T) => T));
}
