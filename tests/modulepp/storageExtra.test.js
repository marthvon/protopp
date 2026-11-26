import assert from "node:assert/strict";
import { constants, generateKeyPairSync, privateDecrypt, publicEncrypt } from "node:crypto";
import test from "node:test";
import { FetchExtra } from "../../min/modulepp/fetchExtra.js";
import { indexExtra } from "../../min/modulepp/indexExtra.js";
import { generateKeyPair, seal, sealDataKey } from "../../min/modulepp/sealExtra.js";
import { StorageExtra, storageExtra } from "../../min/modulepp/storageExtra.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class FakeWebStorage {
   #items = new Map();
   get length() {
      return this.#items.size;
   }
   key(index) {
      return Array.from(this.#items.keys())[index] ?? null;
   }
   getItem(key) {
      return this.#items.has(key) ? this.#items.get(key) : null;
   }
   setItem(key, value) {
      this.#items.set(key, String(value));
   }
   removeItem(key) {
      this.#items.delete(key);
   }
}

function fakeCaches() {
   const stores = new Map();
   return {
      async open(name) {
         if (!stores.has(name)) {
            const entries = new Map();
            stores.set(name, {
               async match(url) {
                  return entries.has(url) ? new Response(entries.get(url)) : undefined;
               },
               async put(url, response) {
                  entries.set(url, await response.text());
               },
               async delete(url) {
                  return entries.delete(url);
               },
               async keys() {
                  return Array.from(entries.keys(), (url) => new Request(url));
               },
            });
         }
         return stores.get(name);
      },
   };
}

function withGlobal(name, value, run) {
   const previous = Object.getOwnPropertyDescriptor(globalThis, name);
   Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
   const restore = () => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
   };
   try {
      const result = run();
      if (result instanceof Promise) return result.finally(restore);
      restore();
      return result;
   } catch (error) {
      restore();
      throw error;
   }
}

function memoryBackend() {
   const entries = new Map();
   return {
      entries,
      read: (id) => entries.get(id),
      write: (id, text) => {
         entries.set(id, text);
      },
      remove: (id) => {
         entries.delete(id);
      },
      ids: () => Array.from(entries.keys()),
   };
}

function response(body, status = 200) {
   return { ok: status >= 200 && status < 300, status, statusText: "OK", json: async () => body };
}

test("plaintext memory storage reads synchronously, expires by ttl, and lists its keys", () => {
   let clock = 1000;
   const storage = storageExtra({ backend: "memory", plaintext: true, ttl: 100, now: () => clock });
   assert.ok(storage instanceof StorageExtra);
   assert.equal(storage.set("a", { x: 1 }), undefined);
   assert.deepEqual(storage.get("a"), { x: 1 });
   storage.set("b", [1], { ttl: 500 });
   assert.deepEqual(storage.keys().sort(), ["a", "b"]);
   clock = 1101;
   assert.equal(storage.get("a"), undefined);
   assert.deepEqual(storage.keys(), ["b"]);
   assert.deepEqual(storage.get("b"), [1]);
   storage.delete("b");
   assert.equal(storage.get("b"), undefined);
   storage.set("c", null);
   assert.equal(storage.get("c"), null);
   storage.clear();
   assert.deepEqual(storage.keys(), []);
});

test("local and session storage keep each name's entries apart", () => {
   const local = new FakeWebStorage();
   const session = new FakeWebStorage();
   withGlobal("localStorage", local, () => withGlobal("sessionStorage", session, () => {
      const a = new StorageExtra({ backend: "local", name: "a", plaintext: true });
      const b = new StorageExtra({ backend: "local", name: "b", plaintext: true });
      a.set("k", 1);
      b.set("k", 2);
      assert.equal(a.get("k"), 1);
      assert.equal(b.get("k"), 2);
      a.clear();
      assert.equal(a.get("k"), undefined);
      assert.equal(b.get("k"), 2);
      assert.equal(local.length, 1);
      new StorageExtra({ backend: "session", plaintext: true }).set("x", true);
      assert.notEqual(session.getItem("protopp:e:x"), null);
   }));
});

test("cache storage is the default backend and is asynchronous", async () => {
   await withGlobal("caches", fakeCaches(), async () => {
      const storage = new StorageExtra({ plaintext: true });
      const written = storage.set("GET /api/a", { a: 1 });
      assert.ok(written instanceof Promise);
      await written;
      assert.deepEqual(await storage.get("GET /api/a"), { a: 1 });
      assert.deepEqual(await storage.keys(), ["GET /api/a"]);
      await storage.clear();
      assert.equal(await storage.get("GET /api/a"), undefined);
   });
   await withGlobal("caches", undefined, () => {
      const storage = new StorageExtra({ plaintext: true });
      assert.throws(() => storage.get("x"), /needs the Cache Storage API/);
   });
});

test("an entry that cannot be read is removed and reported once", () => {
   const backend = memoryBackend();
   const storage = new StorageExtra({ backend, plaintext: true });
   backend.entries.set("e:x", "not json");
   assert.throws(() => storage.get("x"), /entry x is not a plaintext storageExtra entry; it was removed/);
   assert.equal(storage.get("x"), undefined);
});

test("encrypted storage keeps values unreadable at rest and opens its data key once per load", async () => {
   const server = await generateKeyPair({ modulusLength: 2048 });
   let unwraps = 0;
   const unwrap = async (wrapped) => {
      ++unwraps;
      return new Uint8Array(await crypto.subtle.decrypt({ name: "RSA-OAEP" }, server.privateKey, wrapped));
   };
   const backend = memoryBackend();
   const options = { backend, encrypt: { publicKeys: [server.publicKey], privateKeys: [unwrap], aad: "user:1" } };
   const first = new StorageExtra(options);
   await first.set("GET /api/posts", [{ id: 1, title: "secret title" }]);
   await first.set("GET /api/me", { name: "Ada" });
   assert.deepEqual(await first.get("GET /api/me"), { name: "Ada" });
   assert.equal(unwraps, 0);
   assert.doesNotMatch(Array.from(backend.entries.values()).join(" "), /secret title|Ada/);

   const reloaded = new StorageExtra(options);
   const [posts, me, again] = await Promise.all([reloaded.get("GET /api/posts"), reloaded.get("GET /api/me"), reloaded.get("GET /api/me")]);
   assert.deepEqual(posts, [{ id: 1, title: "secret title" }]);
   assert.deepEqual(me, { name: "Ada" });
   assert.deepEqual(again, me);
   assert.equal(unwraps, 1);

   backend.entries.set("e:GET /api/posts", backend.entries.get("e:GET /api/me"));
   await assert.rejects(reloaded.get("GET /api/posts"), /could not be opened with this storage's data key; it was removed/);
   assert.equal(await reloaded.get("GET /api/posts"), undefined);
   backend.entries.set("e:GET /api/me", JSON.stringify({ v: 1, at: 0, exp: null, data: { name: "Eve" } }));
   await assert.rejects(reloaded.get("GET /api/me"), /is not an encrypted storageExtra entry/);

   const otherUser = new StorageExtra({ ...options, encrypt: { ...options.encrypt, aad: "user:2" } });
   await assert.rejects(otherUser.set("x", 1), /could not open the sealed value/);
});

test("when the server wraps its own share, a data key planted in storage never opens", async () => {
   const serverKeys = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
   const oaep = { padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" };
   const wrapOnServer = async (share) => publicEncrypt({ key: serverKeys.publicKey, ...oaep }, share).toString("base64");
   const unwrapOnServer = async (wrapped) => privateDecrypt({ key: serverKeys.privateKey, ...oaep }, wrapped);
   const device = await generateKeyPair({ modulusLength: 2048, extractable: false });
   const backend = memoryBackend();
   const options = { backend, encrypt: { publicKeys: [device.publicKey, wrapOnServer], privateKeys: [device.privateKey, unwrapOnServer], aad: "user:1" } };
   await new StorageExtra(options).set("GET /api/me", { name: "Ada" });
   assert.deepEqual(await new StorageExtra(options).get("GET /api/me"), { name: "Ada" });

   const attacker = await generateKeyPair({ modulusLength: 2048 });
   const planted = await sealDataKey({ publicKeys: [device.publicKey, attacker.publicKey], aad: "user:1\u0000protopp" });
   const forged = await seal({ at: 0, exp: null, data: { name: "Eve" } }, { dataKey: planted.key, aad: "user:1\u0000protopp\u0000GET /api/me" });
   backend.entries.set("k", planted.sealed);
   backend.entries.set("e:GET /api/me", JSON.stringify({ v: 1, sealed: forged }));
   await assert.rejects(new StorageExtra(options).get("GET /api/me"));
   assert.ok(backend.entries.has("e:GET /api/me"));
});

test("storage options must choose encryption or plaintext explicitly", () => {
   assert.throws(() => new StorageExtra(), /needs encrypt: \{ publicKeys, privateKeys \} or plaintext: true/);
   assert.throws(() => new StorageExtra({ plaintext: true, encrypt: { publicKeys: [], privateKeys: [] } }), /not both/);
   assert.throws(() => new StorageExtra({ encrypt: { publicKeys: [] } }), /needs publicKeys and privateKeys/);
   assert.throws(() => new StorageExtra({ backend: "indexeddb", plaintext: true }), /backend must be/);
   assert.throws(() => new StorageExtra({ backend: "memory", plaintext: true }).set("x", undefined), /cannot store undefined/);
});

test("fetchExtra uses a storage as its cache for GET requests only", async () => {
   const calls = [];
   const fetchMethod = async (url, init) => {
      calls.push(init.method);
      return response({ url, method: init.method });
   };
   const storage = new StorageExtra({ backend: "memory", plaintext: true });
   const options = { fetchMethod, defaultUrl: "/api/posts", cleanFetcher: (res) => res.json(), cacher: storage };
   assert.deepEqual(await new FetchExtra(options).fetch(), { url: "/api/posts", method: "GET" });
   const reloaded = new FetchExtra(options);
   assert.deepEqual(reloaded.fetch(), { url: "/api/posts", method: "GET" });
   assert.equal(calls.length, 1);
   await reloaded.fetch({ method: "POST", config: { body: "x" } });
   await reloaded.fetch({ method: "POST", config: { body: "x" } });
   assert.deepEqual(calls, ["GET", "POST", "POST"]);
   assert.deepEqual(storage.keys(), ["GET /api/posts"]);
   await reloaded.fetch({ force: true });
   assert.equal(calls.length, 4);

   const reports = [];
   const full = new StorageExtra({ backend: { read: () => undefined, write: () => { throw new Error("quota exceeded"); }, remove() {}, ids: () => [] }, plaintext: true });
   const loader = new FetchExtra({ ...options, cacher: full, errorCallback: (error, tries, isFetcher) => reports.push([error.message, tries, isFetcher]) });
   assert.deepEqual(await loader.fetch(), { url: "/api/posts", method: "GET" });
   assert.deepEqual(reports, [["quota exceeded", 0, false]]);
});

test("mirror restores a table and saves it after changes until stopped", async () => {
   const storage = new StorageExtra({ backend: "memory", plaintext: true });
   const table = indexExtra({ id: "primary", title: undefined });
   const stop = await storage.mirror(table, "posts", { delay: 5 });
   table.upsert({ id: 1, title: "a" });
   table.upsert({ id: 2, title: "b" });
   await sleep(30);
   assert.equal(storage.get("posts").rows.length, 2);

   const copy = indexExtra({ id: "primary", title: undefined });
   const stopCopy = await storage.mirror(copy, "posts", { delay: 5 });
   assert.equal(copy.get(2).title, "b");
   await sleep(30);
   assert.equal(storage.get("posts").rows.length, 2);
   stopCopy();

   stop();
   table.upsert({ id: 3, title: "c" });
   await sleep(30);
   assert.equal(storage.get("posts").rows.length, 2);

   const errors = [];
   storage.set("broken", { not: "a snapshot" });
   const empty = indexExtra({ id: "primary" });
   (await storage.mirror(empty, "broken", { errorCallback: (error) => errors.push(error.message) }))();
   assert.equal(empty.size, 0);
   assert.match(errors[0], /not a version 1 snapshot/);
   assert.equal(storage.get("broken"), undefined);
});
