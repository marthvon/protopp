import assert from "node:assert/strict";
import { constants, generateKeyPairSync, privateDecrypt, publicEncrypt } from "node:crypto";
import test from "node:test";
import { fromBase64, generateKeyPair, seal, sealDataKey, toBase64, unseal, unsealDataKey } from "../../min/modulepp/sealExtra.js";

const server = await generateKeyPair({ modulusLength: 2048 });
const device = await generateKeyPair({ modulusLength: 2048 });
const value = { v: 1, rows: [[1700000000000, { id: 1, title: "é 漢 😀" }]] };

test("a value sealed for two key pairs opens only with both private keys in order", async () => {
   const sealed = await seal(value, { publicKeys: [server.publicKey, device.publicKey], aad: "user:1" });
   assert.doesNotMatch(sealed, /title|1700000000000/);
   assert.deepEqual(await unseal(sealed, { privateKeys: [server.privateKey, device.privateKey], aad: "user:1" }), value);
   await assert.rejects(unseal(sealed, { privateKeys: [server.privateKey], aad: "user:1" }), /needs 2 private keys/);
   await assert.rejects(unseal(sealed, { privateKeys: [device.privateKey, server.privateKey], aad: "user:1" }), /private key 1 does not open key share 1/);
   await assert.rejects(unseal(sealed, { privateKeys: [server.privateKey, device.privateKey], aad: "user:2" }), /could not open the sealed value/);
   const envelope = JSON.parse(sealed);
   const bytes = fromBase64(envelope.data);
   bytes[0] ^= 1;
   envelope.data = toBase64(bytes);
   await assert.rejects(unseal(JSON.stringify(envelope), { privateKeys: [server.privateKey, device.privateKey], aad: "user:1" }), /could not open the sealed value/);
});

test("JWKs and a server-side unwrap function open the same value", async () => {
   const publicJwk = await crypto.subtle.exportKey("jwk", server.publicKey);
   const privateJwk = await crypto.subtle.exportKey("jwk", server.privateKey);
   const sealed = await seal(value, { publicKeys: publicJwk });
   assert.deepEqual(await unseal(sealed, { privateKeys: privateJwk }), value);
   const pkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", server.privateKey)).toString("base64");
   const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----\n`;
   const unwrapOnServer = async (wrapped) => {
      const body = toBase64(wrapped);
      const share = privateDecrypt({ key: pem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(body, "base64"));
      return share.toString("base64");
   };
   assert.deepEqual(await unseal(sealed, { privateKeys: [unwrapOnServer] }), value);
});

test("plaintext needs an explicit opt-in on both sides and sealing needs keys", async () => {
   const plain = await seal(value, { plaintext: true });
   assert.deepEqual(JSON.parse(plain).data, value);
   await assert.rejects(unseal(plain, { privateKeys: [server.privateKey] }), /refused a plaintext value/);
   assert.deepEqual(await unseal(plain, { plaintext: true }), value);
   await assert.rejects(seal(value), /needs at least one public key, or \{ plaintext: true \}/);
   await assert.rejects(unseal("not json"), /could not read/);
   await assert.rejects(unseal(JSON.stringify({ v: 2 })), /unknown version/);
   await assert.rejects(unseal(JSON.stringify({ v: 1, alg: "RSA-OAEP-256+A256GCM", keys: [1], iv: "", data: "" }), { privateKeys: [server.privateKey] }), /malformed/);
});

test("when the server wraps its own share, only the device key plus the server can open or forge a value", async () => {
   const serverKeys = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
   const oaep = { padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" };
   const wrapOnServer = async (share) => publicEncrypt({ key: serverKeys.publicKey, ...oaep }, share).toString("base64");
   const unwrapOnServer = async (wrapped) => privateDecrypt({ key: serverKeys.privateKey, ...oaep }, wrapped);
   const sealed = await seal(value, { publicKeys: [device.publicKey, wrapOnServer], aad: "user:1" });
   assert.deepEqual(await unseal(sealed, { privateKeys: [device.privateKey, unwrapOnServer], aad: "user:1" }), value);
   await assert.rejects(unseal(sealed, { privateKeys: [device.privateKey, device.privateKey], aad: "user:1" }), /private key 2 does not open key share 2/);

   const attacker = await generateKeyPair({ modulusLength: 2048 });
   const forged = await seal({ evil: true }, { publicKeys: [device.publicKey, attacker.publicKey], aad: "user:1" });
   await assert.rejects(unseal(forged, { privateKeys: [device.privateKey, unwrapOnServer], aad: "user:1" }));
   const spliced = JSON.parse(forged);
   spliced.keys[1] = JSON.parse(sealed).keys[1];
   await assert.rejects(unseal(JSON.stringify(spliced), { privateKeys: [device.privateKey, unwrapOnServer], aad: "user:1" }), /could not open the sealed value/);
});

test("a data key seals values with AES only and needs the private keys only to reopen the key", async () => {
   const { key, sealed } = await sealDataKey({ publicKeys: [server.publicKey], aad: "store" });
   const value = await seal({ a: 1 }, { dataKey: key, aad: "entry" });
   assert.equal(JSON.parse(value).alg, "A256GCM");
   assert.deepEqual(await unseal(value, { dataKey: key, aad: "entry" }), { a: 1 });
   const reopened = await unsealDataKey(sealed, { privateKeys: [server.privateKey], aad: "store" });
   assert.deepEqual(await unseal(value, { dataKey: reopened, aad: "entry" }), { a: 1 });
   await assert.rejects(crypto.subtle.exportKey("raw", reopened));
   await assert.rejects(unseal(value, { dataKey: reopened, aad: "other entry" }), /could not open the sealed value/);
   await assert.rejects(unseal(value, { privateKeys: [server.privateKey] }), /needs the dataKey that sealed this value/);
   await assert.rejects(unsealDataKey(sealed, { privateKeys: [server.privateKey], aad: "other store" }), /could not open the sealed value/);
   await assert.rejects(seal(1, { dataKey: {} }), /dataKey must come from sealDataKey or unsealDataKey/);
});

test("base64 helpers round trip every byte", () => {
   const bytes = new Uint8Array(70000).map((_, i) => i % 256);
   assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
   assert.equal(toBase64(new Uint8Array([104, 105])), "aGk=");
});
