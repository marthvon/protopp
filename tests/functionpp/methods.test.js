import assert from "node:assert/strict";
import test from "node:test";
import Fifo from "../../src/classpp/Fifo.js";
import Lfu from "../../src/classpp/Lfu.js";
import Lru from "../../src/classpp/Lru.js";
import SuppressedError from "../../src/classpp/SuppressedError.js";
import "../../src/functionpp/index.js";
import { memoize } from "../../min/runtime/function/memoize.js";
import { memoizeFifo } from "../../min/runtime/function/memoizeFifo.js";
import { memoizeLfu } from "../../min/runtime/function/memoizeLfu.js";
import { memoizeLru } from "../../min/runtime/function/memoizeLru.js";

function sequenced() {
   let n = 0;
   return () => `Hello World${n++}`;
}

test("lru evicts the least recently used key and refreshes on get and update", () => {
   const evicted = [];
   const cache = new Lru(2, (value, key) => evicted.push([value, key]));
   assert.equal(cache.get("missing"), undefined);
   assert.equal(cache.has("missing"), false);
   cache.set("a", 1);
   cache.set("b", 2);
   cache.set("b", 3);
   assert.deepEqual(evicted, []);
   assert.equal(cache.peek("a"), 1);
   cache.set("c", 4);
   assert.deepEqual(evicted, [[1, "a"]]);
   assert.equal(cache.get("b"), 3);
   assert.equal(cache.has("a"), false);
   cache.set("d", undefined);
   assert.equal(cache.has("d"), true);
   assert.equal(cache.get("d"), undefined);
});

test("lru peek does not refresh recency", () => {
   const cache = new Lru(2);
   cache.set("a", 1);
   cache.set("b", 2);
   assert.equal(cache.peek("a"), 1);
   cache.set("c", 3);
   assert.equal(cache.has("a"), false);
   assert.equal(cache.get("b"), 2);
});

test("fifo keeps insertion order across updates", () => {
   const evicted = [];
   const cache = new Fifo(2, (value, key) => evicted.push([value, key]));
   cache.set("a", 1);
   cache.set("b", 2);
   cache.set("a", 3);
   assert.deepEqual(evicted, []);
   assert.equal(cache.get("a"), 3);
   cache.set("c", 4);
   assert.deepEqual(evicted, [[3, "a"]]);
   assert.equal(cache.has("b"), true);
   assert.equal(cache.get("c"), 4);
});

test("lfu evicts the oldest lowest frequency and does not leave a ghost on update", () => {
   const evicted = [];
   const cache = new Lfu(2, (value, key) => evicted.push([value, key]));
   assert.equal(cache.get("missing"), undefined);
   cache.set("a", 1);
   cache.set("b", 2);
   assert.equal(cache.get("a"), 1);
   cache.set("a", 3);
   assert.deepEqual(evicted, []);
   cache.set("c", 4);
   assert.deepEqual(evicted, [[2, "b"]]);
   assert.equal(cache.peek("a"), 3);
   assert.equal(cache.has("b"), false);
   assert.equal(cache.get("c"), 4);
});

test("lfu breaks frequency ties by age and peek does not bump frequency", () => {
   const aged = new Lfu(2);
   aged.set("a", 1);
   aged.set("b", 2);
   aged.get("a");
   aged.get("b");
   aged.set("c", 3);
   assert.equal(aged.has("a"), false);
   assert.equal(aged.peek("b"), 2);
   const peeked = new Lfu(2);
   peeked.set("a", 1);
   peeked.set("b", 2);
   peeked.peek("a");
   peeked.peek("a");
   peeked.set("c", 3);
   assert.equal(peeked.has("a"), false);
   assert.equal(peeked.get("b"), 2);
});

test("delete does not call onDealloc and a one-slot cache evicts the previous key", () => {
   let called = false;
   const cache = new Lru(1, () => { called = true; });
   cache.set("a", 1);
   assert.equal(cache.delete("a"), true);
   assert.equal(cache.delete("a"), false);
   assert.equal(called, false);
   cache.set("b", 2);
   cache.set("c", 3);
   assert.equal(called, true);
   assert.equal(cache.has("b"), false);
   assert.equal(cache.get("c"), 3);
});

test("cache constructors reject a limit that is not a positive integer", () => {
   assert.throws(() => new Lru(0), /allocLimit/);
   assert.throws(() => new Lfu(1.2), /allocLimit/);
   assert.throws(() => new Fifo(undefined), /allocLimit/);
   assert.equal(new Fifo(1).set("a", 1), 1);
});

test("memoize caches by arguments and does not cache a throw", () => {
   const fn = sequenced();
   const memo = fn.memoize();
   assert.equal(memo(), "Hello World0");
   assert.equal(memo(), "Hello World0");
   let calls = 0;
   const failing = () => {
      calls++;
      throw new Error("x");
   };
   const memoFail = failing.memoize();
   assert.throws(() => memoFail(), /x/);
   assert.throws(() => memoFail(), /x/);
   assert.equal(calls, 2);
});

test("memoize policies keep the limit-3 sequences and agree with dispatch", () => {
   const fifo = ["Hello World0", "Hello World1", "Hello World2", "Hello World2", "Hello World3", "Hello World4"];
   const lru = ["Hello World0", "Hello World1", "Hello World2", "Hello World0", "Hello World3", "Hello World4"];
   const lfu = ["Hello World0", "Hello World1", "Hello World2", "Hello World2", "Hello World1", "Hello World3", "Hello World4"];
   function run(wrap, calls) {
      const fn = sequenced();
      const memo = wrap(fn);
      return calls.map((arg) => memo(arg));
   }
   assert.deepEqual(run((fn) => fn.memoizeFifo(3), [1, 2, 3, 3, 4, 1]), fifo);
   assert.deepEqual(run((fn) => memoizeFifo(fn, 3), [1, 2, 3, 3, 4, 1]), fifo);
   assert.deepEqual(run((fn) => fn.memoizeLru(3), [1, 2, 3, 1, 4, 2]), lru);
   assert.deepEqual(run((fn) => memoizeLru(fn, 3), [1, 2, 3, 1, 4, 2]), lru);
   assert.deepEqual(run((fn) => fn.memoizeLfu(3), [1, 2, 3, 3, 2, 4, 1]), lfu);
   assert.deepEqual(run((fn) => memoizeLfu(fn, 3), [1, 2, 3, 3, 2, 4, 1]), lfu);
   const wrapped = sequenced().memoize();
   assert.equal(wrapped(), "Hello World0");
   assert.equal(wrapped(), "Hello World0");
   const dispatched = memoize(sequenced());
   assert.equal(dispatched(), "Hello World0");
   assert.equal(dispatched(), "Hello World0");
});

test("memoize eviction reports the cached value and then the key", () => {
   const evicted = [];
   let n = 0;
   const fn = (x) => `v${x}${n++}`;
   const memo = fn.memoizeLru(2, (value, key) => evicted.push([value, key]));
   assert.equal(memo("a"), "va0");
   assert.equal(memo("b"), "vb1");
   assert.equal(memo("c"), "vc2");
   assert.deepEqual(evicted, [["va0", "[\"a\"]"]]);
});

test("memoize allocLimit must be an integer greater than 1", () => {
   const fn = function() {};
   assert.throws(() => fn.memoizeLru(1), /allocLimit/);
   assert.throws(() => fn.memoizeLru(), /allocLimit/);
   assert.throws(() => fn.memoizeFifo(2.5), /allocLimit/);
   assert.throws(() => fn.memoizeLfu(NaN), /allocLimit/);
});

test("async memoize shares one in-flight call and forgets a rejection", async () => {
   let release;
   const gate = new Promise((resolve) => { release = resolve; });
   let calls = 0;
   const fn = async (x) => {
      calls++;
      await gate;
      return x;
   };
   const memo = fn.memoize();
   const first = memo("a");
   const second = memo("a");
   const other = memo("b");
   assert.equal(calls, 2);
   release();
   assert.equal(await first, "a");
   assert.equal(await second, "a");
   assert.equal(await other, "b");
   assert.equal(calls, 2);
   let fails = 0;
   const bad = async () => {
      fails++;
      throw new Error("no");
   };
   const memoBad = bad.memoizeLru(2);
   await assert.rejects(memoBad(), /no/);
   await assert.rejects(memoBad(), /no/);
   assert.equal(fails, 2);
   let runs = 0;
   const dispatched = memoize(async (x) => {
      runs++;
      return x;
   });
   assert.equal(await dispatched(1), 1);
   assert.equal(await dispatched(1), 1);
   assert.equal(runs, 1);
});

test("debounce runs the first call now and spaces the rest", async (t) => {
   t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
   const calls = [];
   const run = function(x) {
      calls.push(x);
      if(x === 2)
         throw new Error("later");
      return x;
   }.debounce(300);
   assert.equal(run(1), 1);
   const second = run(2);
   const third = run(3);
   assert.ok(second instanceof Promise);
   t.mock.timers.tick(300);
   await assert.rejects(second, /later/);
   t.mock.timers.tick(300);
   assert.equal(await third, 3);
   assert.deepEqual(calls, [1, 2, 3]);
});

test("throttle skips the window, allows the deadline, and marks an undefined return", async (t) => {
   t.mock.timers.enable({ apis: ["Date"], now: 1000 });
   let x = 4;
   const run = function() { return x; }.throttle(300);
   const empty = function() {}.throttle(300);
   assert.equal(run(), 4);
   assert.equal(run(), undefined);
   t.mock.timers.setTime(1299);
   assert.equal(run(), undefined);
   t.mock.timers.setTime(1300);
   assert.equal(run(), undefined);
   t.mock.timers.setTime(1301);
   assert.equal(run(), 4);
   assert.deepEqual(empty(), { returns: undefined });
   const asyncRun = async function() { return x; }.throttle(300);
   assert.equal(await asyncRun(), 4);
   assert.equal(await asyncRun(), undefined);
   t.mock.timers.setTime(1601);
   assert.equal(await asyncRun(), undefined);
   t.mock.timers.setTime(1602);
   assert.equal(await asyncRun(), 4);
   const asyncEmpty = async function() {}.throttle(300);
   assert.deepEqual(await asyncEmpty(), { returns: undefined });
});

test("deferrable runs defers after the call and keeps the caller", () => {
   const obj = { a: 1, b: 2, name: "obj" };
   const ran = [];
   const deferrer = function() {
      ran.push(this.name);
      this.defer = () => {
         delete obj.a;
         ran.push("first");
      };
      this.defer = () => ran.push("second");
      this.added = 5;
      return this.b;
   }.deferrable();
   assert.equal(deferrer.call(obj), 2);
   assert.equal(obj.a, undefined);
   assert.equal(obj.b, 2);
   assert.equal(obj.added, 5);
   assert.equal("defer" in obj, false);
   assert.deepEqual(ran, ["obj", "first", "second"]);
   class Box {
      constructor() { this.n = 1; }
      read() { return this.n; }
   }
   const box = new Box();
   const read = function() { return this.read(); }.deferrable();
   assert.equal(read.call(box), 1);
});

test("deferrable runs defers after a throw, skips null, and accepts finalizeIt", () => {
   const ran = [];
   const failing = function() {
      this.defer = () => ran.push("defer");
      throw new Error("boom");
   }.deferrable();
   assert.throws(() => failing.call({}), /boom/);
   assert.deepEqual(ran, ["defer"]);
   const skipped = function() {
      this.defer = null;
      return 1;
   }.deferrable();
   assert.equal(skipped.call({}), 1);
   const finalized = function() {
      this.defer = { finalizeIt() { ran.push("fin"); } };
      return 2;
   }.deferrable();
   assert.equal(finalized.call({}), 2);
   assert.deepEqual(ran, ["defer", "fin"]);
});

test("a throwing defer still lets the rest run", () => {
   const ran = [];
   const fn = function() {
      this.defer = () => { throw new Error("d1"); };
      this.defer = () => ran.push("d2");
      return 1;
   }.deferrable();
   assert.throws(() => fn.call({}), /d1/);
   assert.deepEqual(ran, ["d2"]);
   const both = function() {
      this.defer = () => { throw new Error("defer"); };
      this.defer = () => { throw new Error("defer2"); };
      throw new Error("body");
   }.deferrable();
   assert.throws(() => both.call({}), (err) => {
      assert.ok(err instanceof SuppressedError);
      assert.deepEqual(err.map((item) => item.message), ["body", "defer", "defer2"]);
      return true;
   });
   const nested = function() {
      this.defer = () => { throw new Error("d1"); };
      this.defer = () => { throw new Error("d2"); };
      throw new SuppressedError(new Error("a"), new Error("b"));
   }.deferrable();
   assert.throws(() => nested.call({}), (err) => {
      assert.deepEqual(err.map((item) => item.message), ["a", "b", "d1", "d2"]);
      return true;
   });
});

test("async deferrable awaits the call before running defers", async () => {
   const ran = [];
   const fn = async function() {
      this.defer = () => ran.push("defer");
      return "ok";
   }.deferrable();
   assert.equal(await fn.call({ tag: 1 }), "ok");
   assert.deepEqual(ran, ["defer"]);
});

test("overridable queues calls and overrides the oldest", async (t) => {
   t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
   const run = function(n) {
      if(n === 3)
         throw new Error("queued");
      return 7 + n;
   }.overridable(1, 100);
   assert.equal(run(0), 7);
   const queued = run(1);
   const replaced = run(2);
   await assert.rejects(queued, (err) => err === "call-overriden");
   t.mock.timers.tick(100);
   assert.equal(await replaced, 9);
   assert.equal(run(4), 11);
   const failing = run(3);
   t.mock.timers.tick(100);
   await assert.rejects(failing, /queued/);
   assert.throws(() => function() {}.overridable(0, 10), /cacheLimit/);
   assert.throws(() => function() {}.overridable(1.5, 10), /cacheLimit/);
});

test("created wrappers match whether the original function is async", () => {
   const sync = function() {};
   const asyncFn = async function() {};
   for (const wrap of [
      (fn) => fn.debounce(1),
      (fn) => fn.memoize(),
      (fn) => fn.deferrable(),
      (fn) => fn.overridable(1, 1),
   ]) {
      assert.equal(Function.isAsync(wrap(sync)), false);
      assert.equal(Function.isAsync(wrap(asyncFn)), true);
   }
});

test("isAsync recognizes async functions and rejects non-functions", () => {
   assert.equal(Function.isAsync(async function() {}), true);
   assert.equal(Function.isAsync(async () => {}), true);
   assert.equal(Function.isAsync(function() {}), false);
   assert.equal(Function.isAsync(null), false);
   assert.equal(Function.isAsync(undefined), false);
});
