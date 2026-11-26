export const MIN: unique symbol;
export const MAX: unique symbol;

export function compareValues(a: unknown, b: unknown): number;

export interface BTreeRange<K> {
   gt?: K;
   gte?: K;
   lt?: K;
   lte?: K;
   reverse?: boolean;
}

export default class BTree<K = any, V = any> {
   constructor(compare?: (a: K, b: K) => number, order?: number);
   readonly compare: (a: K, b: K) => number;
   readonly order: number;
   readonly size: number;
   has(key: K): boolean;
   get(key: K): V | undefined;
   set(key: K, value: V): this;
   delete(key: K): boolean;
   clear(): void;
   first(): [K, V] | undefined;
   last(): [K, V] | undefined;
   entries(range?: BTreeRange<K>): Generator<[K, V], void, unknown>;
   keys(range?: BTreeRange<K>): Generator<K, void, unknown>;
   values(range?: BTreeRange<K>): Generator<V, void, unknown>;
   [Symbol.iterator](): Generator<[K, V], void, unknown>;
}
