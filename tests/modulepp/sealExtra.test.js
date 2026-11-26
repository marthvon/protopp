import assert from "node:assert/strict";
import { constants, privateDecrypt } from "node:crypto";
import test from "node:test";
import { fromBase64, generateKeyPair, seal, toBase64, unseal } from "../../min/modulepp/sealExtra.js";

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

test("base64 helpers round trip every byte", () => {
   const bytes = new Uint8Array(70000).map((_, i) => i % 256);
   assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
   assert.equal(toBase64(new Uint8Array([104, 105])), "aGk=");
});
