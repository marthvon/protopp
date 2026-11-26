import type { SealOptions, UnsealOptions } from "./sealExtra.js";

export type IndexKind = "primary" | "unique" | "indexed" | "uniquelyOrdered" | "indexedOrdered";

export interface IndexSpec<Row> {
   kind: IndexKind;
   fields?: ReadonlyArray<keyof Row & string>;
   key?: (row: Row) => unknown;
   compare?: (a: any, b: any) => number;
   onConflict?: "throw" | "replace";
}

export type IndexSchema<Row> = Record<string, IndexKind | IndexSpec<Row> | undefined | null>;

export interface WhereOperators {
   eq?: unknown;
   in?: ReadonlyArray<unknown>;
   gt?: unknown;
   gte?: unknown;
   lt?: unknown;
   lte?: unknown;
   prefix?: string | ReadonlyArray<unknown>;
}

export interface IndexQuery<Row> {
   where?: Record<string, unknown>;
   filter?: (row: Row) => boolean;
   orderBy?: string | ReadonlyArray<string> | ((a: Row, b: Row) => number);
   offset?: number;
   limit?: number;
}

export interface UpsertEvent<Row extends object = any> {
   row: Row;
   previous: Row | undefined;
   fetchedAt: number;
   source: "upsert" | "patch" | "restore";
   table: IndexTable<Row>;
}

export interface DeleteEvent<Row extends object = any> {
   row: Row;
   fetchedAt: number;
   reason: "delete" | "invalidate" | "stale" | "conflict" | "clear";
   table: IndexTable<Row>;
}

export interface StaleEvent<Row extends object = any> {
   row: Row;
   fetchedAt: number;
   age: number;
   table: IndexTable<Row>;
}

export interface IndexPlugin<Row extends object = any> {
   upsert?(event: UpsertEvent<Row>): void;
   delete?(event: DeleteEvent<Row>): void;
   stale?(event: StaleEvent<Row>): boolean | void;
}

export interface IndexOptions<Row extends object = any> {
   now?: () => number;
   onDealloc?: (row: Row) => void;
   plugins?: ReadonlyArray<IndexPlugin<Row>>;
}

export interface IndexSnapshot<Row> {
   v: 1;
   rows: Array<[fetchedAt: number, row: Row]>;
}

export type Invalidation<Row> = ((row: Row, fetchedAt: number) => boolean) | { olderThan: number } | { before: number | Date };

export class IndexTable<Row extends object = any> {
   constructor(schema: IndexSchema<Row>, options?: IndexOptions<Row>);
   readonly size: number;
   upsert(...rows: Row[]): this;
   patch(key: unknown, changes: Partial<Row>): Row | undefined;
   has(key: unknown): boolean;
   get(key: unknown): Row | undefined;
   get(key: unknown, index: string): Row | Row[] | undefined;
   delete(...keys: unknown[]): number;
   fetchedAt(key: unknown): number | undefined;
   query(query?: IndexQuery<Row>): Row[];
   count(query?: IndexQuery<Row>): number;
   rows(): Row[];
   [Symbol.iterator](): Iterator<Row>;
   invalidate(spec: Invalidation<Row>): Row[];
   use(plugin: IndexPlugin<Row>): () => void;
   clear(): number;
   snapshot(): IndexSnapshot<Row>;
   restore(snapshot: IndexSnapshot<Row>, options?: { revive?: (row: any) => Row }): number;
   encode(options: SealOptions): Promise<string>;
   decode(sealed: string, options: UnsealOptions & { revive?: (row: any) => Row }): Promise<number>;
}

export function indexExtra<Row extends object = any>(schema: IndexSchema<Row>, options?: IndexOptions<Row>): IndexTable<Row>;

export function expireAfter(ms: number): IndexPlugin;
