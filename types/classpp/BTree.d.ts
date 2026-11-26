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

export interface BTreeViewOptions<K, V> extends BTreeRange<K> {
   offset?: number;
   limit?: number;
   mask?: { has(value: V): boolean } | ((value: V, key: K) => boolean);
}

export class BTreeView<K = any, V = any> implements Iterable<[K, V]> {
   [Symbol.iterator](): Iterator<[K, V]>;
   keys(): Generator<K, void, unknown>;
   values(): Generator<V, void, unknown>;
   toArray(): Array<[K, V]>;
   count(): number;
}

export default class BTree<K = any, V = any> {
   constructor(compare?: (a: K, b: K) => number, order?: number);
   readonly compare: (a: K, b: K) => number;
   readonly order: number;
   readonly size: number;
   readonly version: number;
   has(key: K): boolean;
   get(key: K): V | undefined;
   set(key: K, value: V): this;
   delete(key: K): boolean;
   clear(): void;
   at(index: number): [K, V] | undefined;
   rank(key: K): number;
   first(): [K, V] | undefined;
   last(): [K, V] | undefined;
   view(options?: BTreeViewOptions<K, V>): BTreeView<K, V>;
   entries(options?: BTreeViewOptions<K, V>): Generator<[K, V], void, unknown>;
   keys(options?: BTreeViewOptions<K, V>): Generator<K, void, unknown>;
   values(options?: BTreeViewOptions<K, V>): Generator<V, void, unknown>;
   [Symbol.iterator](): Generator<[K, V], void, unknown>;
}
