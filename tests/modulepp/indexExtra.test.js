import assert from "node:assert/strict";
import test from "node:test";
import { compareValues } from "../../min/classpp/BTree.js";
import { IndexTable, expireAfter, indexExtra } from "../../min/modulepp/indexExtra.js";
import { generateKeyPair } from "../../min/modulepp/sealExtra.js";

const ids = (rows) => rows.map((row) => row.id);

function random(seed) {
   return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}

function posts(options) {
   return indexExtra({
      id: "primary",
      slug: "unique",
      authorId: "indexed",
      createdAt: "indexedOrdered",
      rank: "uniquelyOrdered",
      authorDate: { kind: "indexedOrdered", fields: ["authorId", "createdAt"] },
      title: undefined,
   }, options);
}

function seed() {
   return [
      { id: 1, slug: "a", authorId: 7, createdAt: 30, rank: 3, title: "Alpha" },
      { id: 2, slug: "b", authorId: 8, createdAt: 10, rank: 1, title: "Beta" },
      { id: 3, slug: "c", authorId: 7, createdAt: 20, rank: 2, title: "Gamma" },
      { id: 4, slug: "d", authorId: 9, createdAt: 40, rank: null, title: "Delta" },
   ];
}

test("get reads one row through unique indexes and a list through the others", () => {
   const table = posts().upsert(...seed());
   assert.ok(table instanceof IndexTable);
   assert.equal(table.size, 4);
   assert.equal(table.get(1).title, "Alpha");
   assert.equal(table.get("c", "slug").id, 3);
   assert.equal(table.get(2, "rank").id, 3);
   assert.deepEqual(ids(table.get(7, "authorId")), [1, 3]);
   assert.deepEqual(ids(table.get(10, "createdAt")), [2]);
   assert.deepEqual(ids(table.get([7, 20], "authorDate")), [3]);
   assert.equal(table.get(99), undefined);
   assert.deepEqual(table.get(99, "authorId"), []);
   assert.equal(table.has(4), true);
   assert.equal(table.has(5), false);
   assert.deepEqual(ids([...table]), [1, 2, 3, 4]);
   assert.throws(() => table.get(1, "title"), /no index named title/);
});

test("query uses equality, in, ranges, prefixes, filters, ordering, and pages", () => {
   const table = posts().upsert(...seed());
   assert.deepEqual(ids(table.query({ where: { authorId: 7 } })), [1, 3]);
   assert.deepEqual(ids(table.query({ where: { authorId: { in: [8, 9] } }, orderBy: "-createdAt" })), [4, 2]);
   assert.deepEqual(ids(table.query({ where: { createdAt: { gte: 20, lt: 40 } } })), [1, 3]);
   assert.deepEqual(ids(table.query({ where: { createdAt: { gte: 20, lt: 40 } }, orderBy: "createdAt" })), [3, 1]);
   assert.deepEqual(ids(table.query({ orderBy: "createdAt" })), [2, 3, 1, 4]);
   assert.deepEqual(ids(table.query({ orderBy: "-createdAt", offset: 1, limit: 2 })), [1, 3]);
   assert.deepEqual(ids(table.query({ orderBy: "rank" })), [4, 2, 3, 1]);
   assert.deepEqual(ids(table.query({ where: { rank: null } })), [4]);
   assert.deepEqual(ids(table.query({ where: { authorDate: { prefix: [7] } }, orderBy: "authorDate" })), [3, 1]);
   assert.deepEqual(ids(table.query({ where: { title: { prefix: "Al" } } })), [1]);
   assert.deepEqual(ids(table.query({ where: { title: "Beta" } })), [2]);
   assert.deepEqual(ids(table.query({ where: { authorId: 7, createdAt: { gt: 25 } } })), [1]);
   assert.deepEqual(ids(table.query({ where: { authorId: undefined } })), [1, 2, 3, 4]);
   assert.deepEqual(ids(table.query({ filter: (row) => row.title.includes("t"), orderBy: ["authorId", "-createdAt"] })), [2, 4]);
   assert.deepEqual(ids(table.query({ orderBy: (a, b) => a.title.localeCompare(b.title) })), [1, 2, 4, 3]);
   assert.deepEqual(table.query({ limit: 0 }), []);
   assert.equal(table.count({ where: { authorId: 7 }, limit: 1 }), 2);
   assert.throws(() => table.query({ where: { authorId: { like: 7 } } }), /unknown operator like/);
   assert.throws(() => table.query({ where: { authorId: { in: 7 } } }), /in must be an array/);
   assert.throws(() => table.query({ offset: -1 }), /offset must be an integer/);
   assert.throws(() => table.query({ orderBy: "-" }), /orderBy takes field or index names/);
});

test("every query plan agrees with a naive filter and sort while rows change", () => {
   const next = random(2026);
   const table = indexExtra({ id: "primary", group: "indexed", score: "indexedOrdered", code: "uniquelyOrdered", label: undefined });
   const oracle = new Map();
   const make = (id, step) => ({ id, group: Math.floor(next() * 6), score: Math.floor(next() * 50), code: `c${id}-${step}`, label: next() < 0.5 ? "x" : "y" });
   for (let id = 0; id < 300; ++id) {
      const row = make(id, 0);
      table.upsert(row);
      oracle.set(id, row);
   }
   const naive = (where, orderBy, offset, limit) => {
      let list = [...oracle.values()].filter((row) => Object.entries(where).every(([name, raw]) => {
         const op = raw !== null && typeof raw === "object" ? raw : { eq: raw };
         const value = row[name];
         return (!("eq" in op) || compareValues(value, op.eq) === 0)
            && (!op.in || op.in.some((item) => compareValues(value, item) === 0))
            && (!("gt" in op) || compareValues(value, op.gt) > 0)
            && (!("gte" in op) || compareValues(value, op.gte) >= 0)
            && (!("lt" in op) || compareValues(value, op.lt) < 0)
            && (!("lte" in op) || compareValues(value, op.lte) <= 0)
            && (op.prefix === undefined || (typeof value === "string" && value.startsWith(op.prefix)));
      }));
      if (orderBy) {
         const terms = (Array.isArray(orderBy) ? orderBy : [orderBy]).map((term) => ({ name: term.replace(/^-/, ""), desc: term.startsWith("-") }));
         list = list.sort((a, b) => {
            for (const term of terms) {
               const result = compareValues(a[term.name], b[term.name]);
               if (result) return term.desc ? -result : result;
            }
            const tie = compareValues(a.id, b.id);
            return terms[0].desc ? -tie : tie;
         });
      }
      return ids(list.slice(offset, offset + limit));
   };
   const orders = [undefined, "score", "-score", "code", "-code", ["group", "-score"], "label", "-group", ["score", "label"], ["-score", "-label"], ["score", "-group"], ["-code", "score"]];
   for (let round = 0; round < 1500; ++round) {
      const roll = next();
      if (roll < 0.2) {
         const id = Math.floor(next() * 330);
         const row = make(id, round + 1);
         table.upsert(row);
         oracle.set(id, row);
      } else if (roll < 0.3) {
         const id = Math.floor(next() * 330);
         assert.equal(table.delete(id), oracle.delete(id) ? 1 : 0);
      }
      const where = {};
      if (next() < 0.5) where.group = next() < 0.5 ? Math.floor(next() * 6) : { in: [Math.floor(next() * 6), Math.floor(next() * 6)] };
      if (next() < 0.4) where.score = { [next() < 0.5 ? "gt" : "gte"]: Math.floor(next() * 50), [next() < 0.5 ? "lt" : "lte"]: Math.floor(next() * 50) };
      if (next() < 0.3) where.label = "x";
      if (next() < 0.2) where.code = { prefix: `c${Math.floor(next() * 30)}` };
      if (next() < 0.1) where.id = { in: [Math.floor(next() * 330), Math.floor(next() * 330), Math.floor(next() * 330)] };
      const orderBy = orders[Math.floor(next() * orders.length)];
      const offset = Math.floor(next() * 4);
      const limit = next() < 0.5 ? Infinity : Math.floor(next() * 25);
      assert.deepEqual(ids(table.query({ where, orderBy, offset, limit })), naive(where, orderBy, offset, limit), JSON.stringify({ round, where, orderBy, offset, limit }));
      assert.equal(table.count({ where }), naive(where, undefined, 0, Infinity).length, JSON.stringify({ round, where }));
   }
   assert.equal(table.size, oracle.size);
});

test("a sort on several keys streams the first key's index and sorts only its ties", () => {
   const table = indexExtra({ id: "primary", score: "indexedOrdered", label: undefined });
   for (let id = 0; id < 1000; ++id) table.upsert({ id, score: Math.floor(id / 2), label: id % 2 ? "a" : "b" });
   let checked = 0;
   const page = table.query({ orderBy: ["-score", "label"], limit: 5, filter: () => ++checked > 0 });
   assert.deepEqual(page.map((row) => [row.score, row.label]), [[499, "a"], [499, "b"], [498, "a"], [498, "b"], [497, "a"]]);
   assert.ok(checked <= 8, `filter ran ${checked} times`);
   assert.equal(table.query({ orderBy: "score", offset: 990 }).length, 10);
   assert.equal(table.count({ where: { score: { gte: 100, lt: 200 } } }), 200);
});

test("a string prefix keeps keys whose next character is the highest code unit", () => {
   const table = indexExtra({ id: "primary", name: "uniquelyOrdered" });
   table.upsert({ id: 1, name: "a" }, { id: 2, name: "a\uffffz" }, { id: 3, name: "b" }, { id: 4, name: "\uffff" }, { id: 5, name: 7 });
   assert.deepEqual(ids(table.query({ where: { name: { prefix: "a" } }, orderBy: "name" })), [1, 2]);
   assert.deepEqual(ids(table.query({ where: { name: { prefix: "\uffff" } } })), [4]);
   assert.equal(table.count({ where: { name: { prefix: "a" } } }), 2);
   assert.equal(table.count({ where: { name: { prefix: "" } } }), 4);
});

test("unique indexes reject a second owner unless they evict it, and nulls never conflict", () => {
   const deallocated = [];
   const table = posts({ onDealloc: (row) => deallocated.push(row.id) }).upsert(...seed());
   assert.throws(() => table.upsert({ id: 5, slug: "a", authorId: 1, createdAt: 1, rank: 9 }), /slug "a" already belongs to id 1/);
   assert.equal(table.size, 4);
   assert.equal(table.get(5), undefined);
   table.upsert({ id: 5, slug: "e", authorId: 1, createdAt: 1, rank: null });
   assert.equal(table.get(5).id, 5);
   table.upsert({ id: 1, slug: "a2", authorId: 7, createdAt: 30, rank: 3, title: "Alpha" });
   assert.equal(table.get("a", "slug"), undefined);
   assert.equal(table.get("a2", "slug").id, 1);
   const evicting = indexExtra({ id: "primary", email: { kind: "unique", onConflict: "replace" } }, { onDealloc: (row) => deallocated.push(row.id) });
   evicting.upsert({ id: 1, email: "x@y" }, { id: 2, email: "x@y" });
   assert.deepEqual(ids(evicting.rows()), [2]);
   assert.deepEqual(deallocated, [1]);
   assert.throws(() => indexExtra({ id: "unique" }), /exactly one primary index/);
   assert.throws(() => indexExtra({ id: "primary", other: "primary" }), /exactly one primary index/);
   assert.throws(() => indexExtra({ id: "primary", other: "sorted" }), /must be one of/);
   assert.throws(() => table.upsert({ slug: "z" }), /missing its primary key id/);
});

test("updates move a row between index entries and patch keeps the primary key", () => {
   const table = posts().upsert(...seed());
   table.upsert({ id: 3, slug: "c", authorId: 8, createdAt: 50, rank: 2, title: "Gamma" });
   assert.deepEqual(ids(table.get(7, "authorId")), [1]);
   assert.deepEqual(ids(table.get(8, "authorId")), [2, 3]);
   assert.deepEqual(ids(table.query({ orderBy: "-createdAt", limit: 1 })), [3]);
   assert.deepEqual(ids(table.query()), [1, 2, 3, 4]);
   const patched = table.patch(2, { createdAt: 60 });
   assert.equal(patched.createdAt, 60);
   assert.deepEqual(ids(table.query({ orderBy: "-createdAt", limit: 1 })), [2]);
   assert.throws(() => table.patch(2, { id: 9 }), /cannot change the primary key/);
   assert.equal(table.patch(99, { title: "none" }), undefined);
   assert.equal(table.delete(1, 2, 99), 2);
   assert.deepEqual(ids(table.query({ orderBy: "createdAt" })), [4, 3]);
   assert.equal(table.clear(), 2);
   assert.equal(table.size, 0);
});

test("fetchedAt drives invalidation and stale plugins hide and then drop old rows", () => {
   let clock = 1000;
   const events = [];
   const table = posts({ now: () => clock });
   table.use({
      upsert: ({ row, previous, source }) => events.push(["upsert", row.id, previous?.id ?? null, source]),
      delete: ({ row, reason }) => events.push(["delete", row.id, reason]),
   });
   table.upsert(...seed().slice(0, 2));
   clock = 2000;
   table.upsert(...seed().slice(2));
   assert.equal(table.fetchedAt(1), 1000);
   assert.equal(table.fetchedAt(3), 2000);
   assert.deepEqual(ids(table.invalidate({ before: 1500 })), [1, 2]);
   clock = 2500;
   table.upsert(...seed().slice(0, 2));
   clock = 2600;
   assert.deepEqual(ids(table.invalidate({ olderThan: 500 })), [3, 4]);
   assert.deepEqual(ids(table.invalidate((row) => row.id === 1)), [1]);
   const stop = table.use(expireAfter(100));
   assert.equal(table.get(2).id, 2);
   clock = 2701;
   assert.equal(table.get(2), undefined);
   assert.equal(table.size, 0);
   stop();
   table.upsert(seed()[0]);
   clock = 99999;
   assert.equal(table.get(1).id, 1);
   assert.deepEqual(events.filter(([kind]) => kind === "delete"), [
      ["delete", 1, "invalidate"], ["delete", 2, "invalidate"], ["delete", 3, "invalidate"], ["delete", 4, "invalidate"],
      ["delete", 1, "invalidate"], ["delete", 2, "stale"],
   ]);
   assert.deepEqual(events[0], ["upsert", 1, null, "upsert"]);
   assert.throws(() => table.invalidate({}), /invalidate takes a predicate/);
});

test("stale rows found during a query are removed after it finishes", () => {
   let clock = 0;
   const table = indexExtra({ id: "primary", score: "indexedOrdered" }, { now: () => clock, plugins: [expireAfter(10)] });
   table.upsert({ id: 1, score: 1 }, { id: 2, score: 2 });
   clock = 5;
   table.upsert({ id: 3, score: 3 });
   clock = 12;
   assert.deepEqual(ids(table.query({ orderBy: "score" })), [3]);
   assert.equal(table.size, 1);
   assert.deepEqual(table.snapshot().rows, [[5, { id: 3, score: 3 }]]);
});

test("snapshot and restore keep fetch times and never overwrite newer rows", () => {
   let clock = 100;
   const table = posts({ now: () => clock }).upsert(...seed());
   const snapshot = table.snapshot();
   const copy = posts({ now: () => 0 });
   assert.equal(copy.restore(snapshot), 4);
   assert.equal(copy.fetchedAt(2), 100);
   assert.deepEqual(copy.query({ orderBy: "createdAt" }), table.query({ orderBy: "createdAt" }));
   clock = 500;
   const fresher = posts({ now: () => clock }).upsert({ ...seed()[0], title: "Fresh" });
   assert.equal(fresher.restore(snapshot), 3);
   assert.equal(fresher.get(1).title, "Fresh");
   const revived = posts().restore(snapshot, { revive: (row) => ({ ...row, title: row.title.toUpperCase() }) });
   assert.equal(revived, 4);
   assert.throws(() => copy.restore({ v: 2, rows: [] }), /not a version 1 snapshot/);
   assert.throws(() => copy.restore({ v: 1, rows: [[1]] }), /\[fetchedAt, row\] pairs/);
});

test("encode and decode go through sealExtra and refuse plaintext unless asked", async () => {
   const pair = await generateKeyPair({ modulusLength: 2048 });
   const table = posts({ now: () => 42 }).upsert(...seed());
   const sealed = await table.encode({ publicKeys: [pair.publicKey], aad: "posts" });
   assert.doesNotMatch(sealed, /Alpha/);
   const copy = posts();
   assert.equal(await copy.decode(sealed, { privateKeys: [pair.privateKey], aad: "posts" }), 4);
   assert.equal(copy.get("d", "slug").title, "Delta");
   assert.equal(copy.fetchedAt(4), 42);
   await assert.rejects(table.encode(), /needs at least one public key/);
   const plain = await table.encode({ plaintext: true });
   await assert.rejects(posts().decode(plain, { privateKeys: [pair.privateKey] }), /refused a plaintext value/);
   assert.equal(await posts().decode(plain, { plaintext: true }), 4);
});

test("composite and computed keys index arrays, dates, and derived values", () => {
   const table = indexExtra({
      id: "primary",
      email: { kind: "unique", key: (row) => row.email?.toLowerCase() },
      day: { kind: "indexedOrdered", key: (row) => new Date(row.at) },
      pair: { kind: "unique", fields: ["a", "b"] },
   });
   table.upsert(
      { id: 1, email: "A@X.io", at: "2026-01-02", a: 1, b: null },
      { id: 2, email: "b@x.io", at: "2026-01-01", a: 1, b: null },
      { id: 3, email: "c@x.io", at: "2026-01-03", a: 1, b: 2 },
   );
   assert.equal(table.get("a@x.io", "email").id, 1);
   assert.deepEqual(ids(table.query({ orderBy: "day" })), [2, 1, 3]);
   assert.deepEqual(ids(table.query({ where: { day: { gte: new Date("2026-01-02") } } })), [1, 3]);
   assert.equal(table.get([1, 2], "pair").id, 3);
   assert.throws(() => table.upsert({ id: 4, email: "d@x.io", at: "2026-01-04", a: 1, b: 2 }), /pair \[1,2\] already belongs to id 3/);
});
