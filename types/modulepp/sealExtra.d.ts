export type SealBytes = Uint8Array | ArrayBuffer | ArrayBufferView | string;

export type SealPublicKey = CryptoKey | JsonWebKey | ((share: Uint8Array) => SealBytes | Promise<SealBytes>);

export type SealPrivateKey = CryptoKey | JsonWebKey | ((wrappedShare: Uint8Array) => SealBytes | Promise<SealBytes>);

export interface SealOptions {
   publicKeys?: SealPublicKey | ReadonlyArray<SealPublicKey>;
   dataKey?: CryptoKey;
   plaintext?: boolean;
   aad?: string;
}

export interface UnsealOptions {
   privateKeys?: SealPrivateKey | ReadonlyArray<SealPrivateKey>;
   dataKey?: CryptoKey;
   plaintext?: boolean;
   aad?: string;
}

export function seal(value: unknown, options?: SealOptions): Promise<string>;
export function unseal<T = any>(sealed: string | object, options?: UnsealOptions): Promise<T>;
export function sealDataKey(options: { publicKeys: SealPublicKey | ReadonlyArray<SealPublicKey>; aad?: string }): Promise<{ key: CryptoKey; sealed: string }>;
export function unsealDataKey(sealed: string, options: { privateKeys: SealPrivateKey | ReadonlyArray<SealPrivateKey>; aad?: string }): Promise<CryptoKey>;
export function generateKeyPair(options?: { modulusLength?: number; extractable?: boolean }): Promise<CryptoKeyPair>;
export function toBase64(value: SealBytes): string;
export function fromBase64(text: string): Uint8Array;
