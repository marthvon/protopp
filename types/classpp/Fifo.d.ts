export default class Fifo<K = any, V = any> {
   constructor(allocLimit: number, onDealloc?: (value: V, key: K) => void);
   has(key: K): boolean;
   peek(key: K): V | undefined;
   get(key: K): V | undefined;
   set(key: K, value: V): V;
   delete(key: K): boolean;
}
