import type { SealPrivateKey, SealPublicKey } from "./sealExtra.js";
import type { IndexTable } from "./indexExtra.js";

export interface StorageBackend {
   read(id: string): string | undefined | Promise<string | undefined>;
   write(id: string, text: string): void | Promise<void>;
   remove(id: string): void | Promise<void>;
   ids(): string[] | Promise<string[]>;
}

export interface StorageEncryption {
   publicKeys: SealPublicKey | ReadonlyArray<SealPublicKey>;
   privateKeys: SealPrivateKey | ReadonlyArray<SealPrivateKey>;
   aad?: string;
}

interface StorageCommonOptions {
   backend?: "cache" | "local" | "session" | "memory" | StorageBackend;
   name?: string;
   ttl?: number;
   now?: () => number;
}

export type StorageExtraOptions = StorageCommonOptions & (
   | { encrypt: StorageEncryption; plaintext?: false }
   | { plaintext: true; encrypt?: undefined }
);

export interface MirrorOptions<Row> {
   delay?: number;
   ttl?: number;
   revive?: (row: any) => Row;
   errorCallback?: (error: unknown) => void;
}

export class StorageExtra<T = any> {
   constructor(options: StorageExtraOptions);
   get(key: string): T | undefined | Promise<T | undefined>;
   set(key: string, value: T, options?: { ttl?: number }): void | Promise<void>;
   delete(key: string): void | Promise<void>;
   keys(): string[] | Promise<string[]>;
   clear(): void | Promise<void>;
   mirror<Row extends object>(table: IndexTable<Row>, key: string, options?: MirrorOptions<Row>): Promise<() => void>;
}

export function storageExtra<T = any>(options: StorageExtraOptions): StorageExtra<T>;
