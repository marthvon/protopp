const VERSION = 1;
const ALGORITHM = 'RSA-OAEP-256+A256GCM';
const DATA_KEY = 'A256GCM';
const PLAINTEXT = 'none';
const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' };
const KEY_BYTES = 32;
const IV_BYTES = 12;
const CHUNK = 0x8000;

function subtle() {
   const api = globalThis.crypto?.subtle;
   if(!api)
      throw new Error('sealExtra needs WebCrypto: a secure context (https or localhost) in browsers, or Node 19+');
   return api;
}

function randomBytes(length) {
   return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function bytesOf(value) {
   if(value instanceof Uint8Array)
      return value;
   else if(value instanceof ArrayBuffer)
      return new Uint8Array(value);
   else if(ArrayBuffer.isView(value))
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
   else if(typeof value === 'string')
      return fromBase64(value);
   throw new TypeError('sealExtra expected bytes, an ArrayBuffer, or a base64 string');
}

export function toBase64(value) {
   const bytes = bytesOf(value);
   if(typeof bytes.toBase64 === 'function')
      return bytes.toBase64();
   let binary = '';
   for(let i = 0; i < bytes.length; i += CHUNK)
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
   return btoa(binary);
}

export function fromBase64(text) {
   if(typeof text !== 'string')
      throw new TypeError('sealExtra expected a base64 string');
   if(typeof Uint8Array.fromBase64 === 'function')
      return Uint8Array.fromBase64(text);
   const binary = atob(text);
   const bytes = new Uint8Array(binary.length);
   for(let i = 0; i < binary.length; ++i)
      bytes[i] = binary.charCodeAt(i);
   return bytes;
}

function isCryptoKey(value) {
   return typeof CryptoKey === 'function' && value instanceof CryptoKey;
}

async function publicKeyOf(key) {
   if(isCryptoKey(key))
      return key;
   else if(key && typeof key === 'object' && key.kty === 'RSA')
      return subtle().importKey('jwk', key, RSA, false, [ 'encrypt' ]);
   throw new TypeError('sealExtra publicKeys must be RSA-OAEP CryptoKeys, RSA JWKs, or wrap functions');
}

async function wrapShare(key, share) {
   if(typeof key !== 'function')
      return new Uint8Array(await subtle().encrypt(RSA, await publicKeyOf(key), share));
   const copy = share.slice();
   try {
      const wrapped = bytesOf(await key(copy));
      if(wrapped.length === 0)
         throw new Error('sealExtra wrap function returned an empty share');
      return wrapped;
   } finally {
      copy.fill(0);
   }
}

async function unwrapShare(key, wrapped, position) {
   if(typeof key === 'function')
      return bytesOf(await key(wrapped.slice()));
   const privateKey = isCryptoKey(key)? key
      : (key && typeof key === 'object' && key.kty === 'RSA'? await subtle().importKey('jwk', key, RSA, false, [ 'decrypt' ]) : null);
   if(!privateKey)
      throw new TypeError('sealExtra privateKeys must be RSA-OAEP CryptoKeys, RSA JWKs, or unwrap functions');
   try {
      return new Uint8Array(await subtle().decrypt(RSA, privateKey, wrapped));
   } catch {
      throw new Error(`sealExtra private key ${position + 1} does not open key share ${position + 1}; pass private keys in the same order as the public keys`);
   }
}

function listOf(keys, label) {
   const list = Array.isArray(keys)? keys : (keys === undefined || keys === null? [] : [ keys ]);
   if(list.length === 0)
      throw new TypeError(`sealExtra needs at least one ${label}, or { plaintext: true } to store without encryption`);
   return list;
}

function additionalData(version, algorithm, wrapped, aad) {
   return new TextEncoder().encode(`${JSON.stringify({ v: version, alg: algorithm, keys: wrapped })}\u0000${aad ?? ''}`);
}

function aesKeyOf(raw, usages) {
   return subtle().importKey('raw', raw, 'AES-GCM', false, usages);
}

async function encryptJson(aesKey, value, additional) {
   const iv = randomBytes(IV_BYTES);
   const data = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: additional }, aesKey, new TextEncoder().encode(JSON.stringify(value)));
   return { iv: toBase64(iv), data: toBase64(data) };
}

async function decryptJson(aesKey, envelope, additional) {
   let data;
   try {
      data = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv), additionalData: additional }, aesKey, fromBase64(envelope.data));
   } catch {
      throw new Error('sealExtra could not open the sealed value: wrong keys, wrong aad, or the data was changed');
   }
   return JSON.parse(new TextDecoder().decode(data));
}

function xorInto(target, source) {
   for(let i = 0; i < target.length; ++i)
      target[i] ^= source[i];
   return target;
}

export async function generateKeyPair({ modulusLength = 3072, extractable = true } = {}) {
   return subtle().generateKey({ ...RSA, modulusLength, publicExponent: new Uint8Array([ 1, 0, 1 ]) }, extractable, [ 'encrypt', 'decrypt' ]);
}

export async function seal(value, { publicKeys, dataKey, plaintext = false, aad } = {}) {
   if(plaintext === true)
      return JSON.stringify({ v: VERSION, alg: PLAINTEXT, data: value });
   else if(dataKey !== undefined) {
      if(!isCryptoKey(dataKey))
         throw new TypeError('sealExtra dataKey must come from sealDataKey or unsealDataKey');
      return JSON.stringify({ v: VERSION, alg: DATA_KEY, ...(await encryptJson(dataKey, value, additionalData(VERSION, DATA_KEY, [], aad))) });
   }
   const keys = listOf(publicKeys, 'public key');
   const contentKey = randomBytes(KEY_BYTES);
   const shares = keys.slice(1).map(() => randomBytes(KEY_BYTES));
   shares.unshift(shares.reduce((rest, share) => xorInto(rest, share), contentKey.slice()));
   try {
      const wrapped = [];
      for(let i = 0; i < keys.length; ++i)
         wrapped.push(toBase64(await wrapShare(keys[i], shares[i])));
      const aesKey = await aesKeyOf(contentKey, [ 'encrypt' ]);
      return JSON.stringify({ v: VERSION, alg: ALGORITHM, keys: wrapped, ...(await encryptJson(aesKey, value, additionalData(VERSION, ALGORITHM, wrapped, aad))) });
   } finally {
      contentKey.fill(0);
      for(const share of shares)
         share.fill(0);
   }
}

export async function unseal(sealed, { privateKeys, dataKey, plaintext = false, aad } = {}) {
   let envelope;
   try {
      envelope = typeof sealed === 'string'? JSON.parse(sealed) : sealed;
   } catch {
      throw new TypeError('sealExtra could not read the sealed value');
   }
   if(!envelope || typeof envelope !== 'object' || envelope.v !== VERSION)
      throw new TypeError('sealExtra sealed value has an unknown version');
   if(envelope.alg === PLAINTEXT) {
      if(plaintext !== true)
         throw new Error('sealExtra refused a plaintext value; pass { plaintext: true } to accept unencrypted data');
      return envelope.data;
   } else if(envelope.alg === DATA_KEY) {
      if(typeof envelope.iv !== 'string' || typeof envelope.data !== 'string')
         throw new TypeError('sealExtra sealed value is malformed');
      if(!isCryptoKey(dataKey))
         throw new Error('sealExtra needs the dataKey that sealed this value');
      return decryptJson(dataKey, envelope, additionalData(envelope.v, envelope.alg, [], aad));
   } else if(envelope.alg !== ALGORITHM || !Array.isArray(envelope.keys) || !envelope.keys.every((key) => typeof key === 'string')
      || typeof envelope.iv !== 'string' || typeof envelope.data !== 'string')
      throw new TypeError('sealExtra sealed value is malformed');
   const keys = listOf(privateKeys, 'private key');
   if(keys.length !== envelope.keys.length)
      throw new Error(`sealExtra needs ${envelope.keys.length} private keys to open this value, got ${keys.length}`);
   const shares = [];
   for(let i = 0; i < keys.length; ++i) {
      const share = await unwrapShare(keys[i], fromBase64(envelope.keys[i]), i);
      if(share.length !== KEY_BYTES)
         throw new Error(`sealExtra key share ${i + 1} unwrapped to the wrong size`);
      shares.push(share);
   }
   const contentKey = shares.slice(1).reduce((rest, share) => xorInto(rest, share), shares[0].slice());
   const aesKey = await aesKeyOf(contentKey, [ 'decrypt' ]);
   contentKey.fill(0);
   return decryptJson(aesKey, envelope, additionalData(envelope.v, envelope.alg, envelope.keys, aad));
}

export async function sealDataKey({ publicKeys, aad } = {}) {
   const raw = randomBytes(KEY_BYTES);
   try {
      const sealed = await seal(toBase64(raw), { publicKeys, aad });
      return { key: await aesKeyOf(raw, [ 'encrypt', 'decrypt' ]), sealed };
   } finally {
      raw.fill(0);
   }
}

export async function unsealDataKey(sealed, { privateKeys, aad } = {}) {
   const raw = fromBase64(await unseal(sealed, { privateKeys, aad }));
   try {
      if(raw.length !== KEY_BYTES)
         throw new Error('sealExtra data key has the wrong size');
      return await aesKeyOf(raw, [ 'encrypt', 'decrypt' ]);
   } finally {
      raw.fill(0);
   }
}
