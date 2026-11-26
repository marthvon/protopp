import assert from "node:assert/strict";
import test from "node:test";
import "../../src/objectpp/index.js";
import { appendInsert } from "../../min/runtime/object/appendInsert.js";
import { castParseIt } from "../../min/runtime/object/castParseIt.js";
import { copyOnly } from "../../min/runtime/object/copyOnly.js";
import { deepCopy } from "../../min/runtime/object/deepCopy.js";
import { deepCopyP } from "../../min/runtime/object/deepCopyP.js";
import { deepGet } from "../../min/runtime/object/deepGet.js";
import { deepGetP } from "../../min/runtime/object/deepGetP.js";
import { deepMerge } from "../../min/runtime/object/deepMerge.js";
import { deepSet } from "../../min/runtime/object/deepSet.js";
import { deepSetP } from "../../min/runtime/object/deepSetP.js";
import { detachIt } from "../../min/runtime/object/detachIt.js";
import { flatIt } from "../../min/runtime/object/flatIt.js";
import { flipIt } from "../../min/runtime/object/flipIt.js";
import { flipItP } from "../../min/runtime/object/flipItP.js";
import { isEquals } from "../../min/runtime/shared/isEquals.js";
import { isEqualsP } from "../../min/runtime/object/isEqualsP.js";
import { letx } from "../../min/runtime/object/letx.js";
import { lets } from "../../min/runtime/object/lets.js";
import { letz } from "../../min/runtime/object/letz.js";
import { mapItIn } from "../../min/runtime/object/mapItIn.js";
import { reduceIt } from "../../min/runtime/object/reduceIt.js";
import { removeKey } from "../../min/runtime/object/removeKey.js";
import { validateIt } from "../../min/runtime/object/validateIt.js";

function agree(expected, actual, dispatched) {
   assert.deepEqual(actual, expected);
   assert.deepEqual(dispatched, expected);
}

function rules() {
   return {
      a: (value) => { if (value < 2) return "number must be greater 1"; },
      b: (value) => { if (value < 2) return "number must be greater 1"; },
      c: (value) => { if (value < 2) return "number must be greater 1"; },
      d: (value) => { if (value < 2) return "number must be greater 1"; },
      f: function() { if (this.hasOwnProperty("g")) return "cannot exist when g also exist"; },
   };
}

function sample() {
   const map = new Map();
   return { a: 0.3, b: "2", c: true, false: { arr: { a: [1, 2] } }, obj: map };
}

test("append, copy, remove, and flip keep the old object results", () => {
   const appended = {};
   appended.appendInsert("a", 1);
   appended.appendInsert("a", 2);
   const dispatched = {};
   appendInsert(dispatched, "a", 1);
   appendInsert(dispatched, "a", 2);
   agree({ a: [1, 2] }, appended, dispatched);
   agree({ keyA: 1, keyB: 2 }, { keyA: 1, keyB: 2, keyC: 3 }.copyOnly("keyA", "keyB"), copyOnly({ keyA: 1, keyB: 2, keyC: 3 }, "keyA", "keyB"));
   const removed = { keyA: 1, keyB: 2, keyC: 3 };
   const removedDispatch = { keyA: 1, keyB: 2, keyC: 3 };
   agree({ keyC: 3 }, removed.removeKey("keyA", "keyB"), removeKey(removedDispatch, "keyA", "keyB"));
   agree({ 1: "a", 2: "b", true: "c" }, { a: 1, b: 2, c: true }.flipIt(), flipIt({ a: 1, b: 2, c: true }));
   assert.equal({ a: 1, b: 2, c: true }.isEquals({ a: 1, b: 2, c: true }), true);
   assert.equal(isEquals({ a: 1, b: 2, c: true }, { a: 1, b: 2, c: true }), true);
});

test("precise equality, flatten, and merge keep references that are not plain objects", () => {
   const shared = { a: [1, 2] };
   const map = new Map();
   const left = { a: 0.3, b: "2", c: true, false: { arr: shared }, obj: map };
   const right = { a: 0.2 + 0.1, b: "2", c: true, false: { arr: shared }, obj: map };
   assert.equal(left.isEqualsP(right), true);
   assert.equal(isEqualsP(left, right), true);
   assert.equal({ a: 0.3, b: "2", c: true }.isEqualsP({ a: 0.2 + 0.1, b: "2", c: true }), true);
   const source = sample();
   agree({ a: 0.3, b: "2", c: true, arr: { a: [1, 2] }, obj: source.obj }, source.flatIt(), flatIt(sample()));
   const twice = { a: [1, 2], b: "2", c: true, obj: source.obj };
   agree(twice, source.flatIt(2), flatIt(sample(), 2));
   agree(twice, source.flatIt(-1), flatIt(sample(), -1));
   const merged = sample();
   const kept = merged.obj;
   merged.deepMerge({ d: 3, false: { arr: 1 }, b: 5 });
   const mergedDispatch = sample();
   const keptDispatch = mergedDispatch.obj;
   deepMerge(mergedDispatch, { d: 3, false: { arr: 1 }, b: 5 });
   assert.equal(merged.b, 5);
   assert.equal(merged.false.arr, 1);
   assert.equal(merged.d, 3);
   assert.equal(merged.obj, kept);
   assert.equal(mergedDispatch.obj, keptDispatch);
   assert.equal(mergedDispatch.b, 5);
   assert.equal(mergedDispatch.false.arr, 1);
   const copied = merged.deepCopy();
   assert.notEqual(copied.obj, merged.obj);
   assert.equal(deepCopy(merged).obj !== merged.obj, true);
   assert.equal(merged.deepCopyP().obj, merged.obj);
   assert.equal(deepCopyP(merged).obj, merged.obj);
});

test("validate, cast, and detach the old fixtures", () => {
   const subject = { a: 3, b: 1, c: 5, d: 0, e: 4, f: 0, g: 0 };
   const [invalid, validated] = subject.validateIt(rules());
   const [invalidDispatch, validatedDispatch] = validateIt({ ...subject }, rules());
   assert.deepEqual(invalid, { b: "number must be greater 1", d: "number must be greater 1", f: "cannot exist when g also exist" });
   assert.deepEqual(validated, { a: 3, c: 5, e: 4, g: 0 });
   assert.deepEqual(invalidDispatch, invalid);
   assert.deepEqual(validatedDispatch, validated);
   const casted = { a: "1" };
   assert.equal(casted.castParseIt({ a: Number }), undefined);
   assert.equal(casted.a, 1);
   const castedDispatch = { a: "1" };
   assert.equal(castParseIt(castedDispatch, { a: Number }), undefined);
   assert.equal(castedDispatch.a, 1);
   const parent = { id: 1, children: [{ child_id: 1 }, { child_id: 2 }, { child_id: 3 }] };
   const children = parent.detachIt("children", "id");
   assert.equal(parent.children, undefined);
   assert.deepEqual(children, [{ child_id: 1, id: 1 }, { child_id: 2, id: 1 }, { child_id: 3, id: 1 }]);
   const parentDispatch = { id: 1, children: [{ child_id: 1 }, { child_id: 2 }, { child_id: 3 }] };
   assert.deepEqual(detachIt(parentDispatch, "children", "id"), children);
});

test("null and cycles stay inside the published object contracts", () => {
   assert.deepEqual([...({ a: 1, b: 2 }).flipItP()], [[1, "a"], [2, "b"]]);
   assert.deepEqual([...flipItP({ a: 1, b: 2 })], [[1, "a"], [2, "b"]]);
   agree({ a: { b: 1 } }, { a: null }.deepMerge({ a: { b: 1 } }), deepMerge({ a: null }, { a: { b: 1 } }));
   function fn() { return 1; }
   assert.equal({ fn }.deepCopyP().fn, fn);
   assert.equal(deepCopyP({ fn }).fn(), 1);
   class Box {
      constructor(n) { this.n = n; }
   }
   const box = new Box(1);
   box.copyIt = function() { return new Box(this.n + 1); };
   assert.equal({ box }.deepCopyP().box.n, 2);
   const same = new Box(1);
   assert.equal(deepCopyP({ item: same }).item, same);
   const cycle = { a: 1 };
   cycle.self = cycle;
   const copied = cycle.deepCopyP();
   assert.equal(copied.self, copied);
   assert.notEqual(copied, cycle);
   assert.equal({ a: 1, b: 2 }.reduceIt((sum, [, value]) => sum + value, 0), 3);
   assert.equal(reduceIt({ a: 1, b: 2 }, (sum, [, value]) => sum + value, 0), 3);
   const replaced = { a: null };
   replaced.deepSetP(["a", "b"], 1);
   assert.deepEqual(replaced, { a: { b: 1 } });
   const replacedDispatch = { a: null };
   deepSetP(replacedDispatch, ["a", "b"], 1);
   assert.deepEqual(replacedDispatch, replaced);
   assert.equal({ a: null }.isEqualsP({ a: null }), true);
   assert.equal({ a: null }.isEqualsP({ a: {} }), false);
   assert.equal({ a: 1 }.isEqualsP(null), false);
   assert.equal(isEqualsP({ a: null }, { a: null }), true);
   assert.equal(isEqualsP({ a: 1 }, null), false);
   const loop = { b: 1 };
   loop.a = loop;
   agree({ b: 1 }, loop.flatIt(-1), flatIt(loop, -1));
   assert.throws(() => Object.prototype.deepGet.call(1, "a"), /deepGet can only be called/);
   assert.throws(() => deepGet(1, "a"), /deepGet can only be called/);
   assert.throws(() => Object.prototype.deepGetP.call(1, "a"), /deepGetP can only be called/);
   assert.equal(deepGetP({ a: null }, "a", "b"), undefined);
});

test("dynamic writes do not pollute a prototype", () => {
   try {
      assert.throws(() => ({}).deepSet(["constructor", "prototype", "polluted"], true), /inherited or missing key/);
      assert.throws(() => deepSet({}, ["constructor", "prototype", "polluted"], true), /inherited or missing key/);
      assert.equal(Object.prototype.polluted, undefined);
      const setp = {};
      setp.deepSetP(["__proto__", "polluted"], true);
      assert.equal(Object.getPrototypeOf(setp), Object.prototype);
      assert.equal(Object.prototype.polluted, undefined);
      const setpDispatch = {};
      deepSetP(setpDispatch, ["__proto__", "polluted"], true);
      assert.equal(Object.getPrototypeOf(setpDispatch), Object.prototype);
      const merged = {}.deepMerge(JSON.parse('{"__proto__":{"polluted":true}}'));
      assert.equal(Object.getPrototypeOf(merged), Object.prototype);
      assert.equal(Object.prototype.polluted, undefined);
      const mergedDispatch = deepMerge({}, JSON.parse('{"__proto__":{"polluted":true}}'));
      assert.equal(Object.getPrototypeOf(mergedDispatch), Object.prototype);
      assert.throws(() => Object.prototype.deepMerge({ polluted: true }), /prototype/);
      assert.throws(() => deepMerge(Object.prototype, { polluted: true }), /prototype/);
      assert.throws(() => Object.prototype.appendInsert("polluted", true), /prototype/);
      assert.throws(() => appendInsert(Object.prototype, "polluted", true), /prototype/);
      const payload = JSON.parse('{"__proto__":{"polluted":true}}');
      assert.equal(Object.hasOwn(payload, "__proto__"), true);
      assert.equal(Object.prototype.polluted, undefined);
      assert.equal(Object.getPrototypeOf(payload.deepCopyP()), Object.prototype);
      assert.equal(Object.getPrototypeOf(deepCopyP(payload)), Object.prototype);
      assert.equal(Object.prototype.polluted, undefined);
   } finally {
      delete Object.prototype.polluted;
   }
});

test("writes go through setters and proxy set traps", () => {
   const writes = [];
   const proxy = new Proxy({}, {
      set(target, key, value, receiver) {
         writes.push(key);
         return Reflect.set(target, key, value, receiver);
      },
   });
   proxy.deepMerge({ a: 1 });
   deepMerge(proxy, { b: 2 });
   appendInsert(proxy, "c", 3);
   castParseIt(proxy, { a: String });
   assert.deepEqual(writes, ["a", "b", "c", "a"]);
   assert.deepEqual({ ...proxy }, { a: "1", b: 2, c: [3] });
   const seen = [];
   const withSetter = { set value(next) { seen.push(next); } };
   deepMerge(withSetter, { value: 1 });
   withSetter.deepMerge({ value: 2 });
   assert.deepEqual(seen, [1, 2]);
   assert.equal(typeof Object.getOwnPropertyDescriptor(withSetter, "value").set, "function");
});

test("let helpers call valueOf and mapItIn stays on own keys", () => {
   const boxed = Object(0);
   assert.equal(boxed.letz((value) => value), 0);
   assert.equal(letz(boxed, (value) => value), 0);
   assert.equal(boxed.lets((value) => value), undefined);
   assert.equal(lets(boxed, (value) => value), undefined);
   assert.equal(boxed.letx((value) => value === 0, (value) => value + 1), 1);
   assert.equal(letx(boxed, (value) => value === 0, (value) => value + 1), 1);
   const bare = Object.create(null);
   assert.equal(Object.prototype.letz.call(bare, (value) => value), bare);
   assert.equal(letz(bare, (value) => value), bare);
   const proto = { inherited: 1 };
   const own = Object.create(proto);
   own.own = 2;
   own.mapItIn(([, value]) => value + 1);
   assert.equal(own.own, 3);
   assert.equal(proto.inherited, 1);
   const ownDispatch = Object.create(proto);
   ownDispatch.own = 2;
   mapItIn(ownDispatch, ([, value]) => value + 1);
   assert.equal(ownDispatch.own, 3);
   assert.equal(proto.inherited, 1);
});
