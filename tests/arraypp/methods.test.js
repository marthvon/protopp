import assert from "node:assert/strict";
import test from "node:test";
import "../../src/arraypp/index.js";
import { combineUniquely } from "../../min/runtime/array/combineUniquely.js";
import { countItBy } from "../../min/runtime/array/countItBy.js";
import { countItByP } from "../../min/runtime/array/countItByP.js";
import { evenlySplit } from "../../min/runtime/array/evenlySplit.js";
import { groupItBy } from "../../min/runtime/array/groupItBy.js";
import { groupItByP } from "../../min/runtime/array/groupItByP.js";
import { justZip } from "../../min/runtime/array/justZip.js";
import { legacyFlat } from "../../min/runtime/array/legacyFlat.js";
import { paginateIt } from "../../min/runtime/array/paginateIt.js";
import { removeIndex } from "../../min/runtime/array/removeIndex.js";
import { removeValue } from "../../min/runtime/array/removeValue.js";
import { searchSorted } from "../../min/runtime/array/searchSorted.js";
import { sortedInsert } from "../../min/runtime/array/sortedInsert.js";
import { zipIt } from "../../min/runtime/array/zipIt.js";
import { zipItr } from "../../min/runtime/array/zipItr.js";
import { flipIt } from "../../min/runtime/object/flipIt.js";
import "../../src/objectpp/index.js";

function plain(value) {
   if(value != null && typeof value === "object" && Object.getPrototypeOf(value) === null)
      return { ...value };
   else
      return value;
}

function agree(expected, actual, dispatched) {
   assert.deepEqual(plain(actual), expected);
   assert.deepEqual(plain(dispatched), expected);
}

function rows(handler, cond) {
   const collected = [];
   handler.forEach({ ...(cond ? { cond } : {}), d0: (values) => collected.push(values.slice()) });
   return collected;
}

test("combine, count, page, and group the old array fixtures", () => {
   agree([1, 2, 3, 4], [1, 2, 3].combineUniquely([1, 4, 3]), combineUniquely([1, 2, 3], [1, 4, 3]));
   const counted = { 1: 2, 2: 1, 3: 2, 4: 1 };
   agree(counted, [1, 2, 3, 1, 4, 3].countItBy(), countItBy([1, 2, 3, 1, 4, 3]));
   assert.equal([1, 2, 3, 1, 4, 3].countItByP().get(1), 2);
   assert.equal(countItByP([1, 2, 3, 1, 4, 3]).get(1), 2);
   agree([[9, 10, 5], [21, 3]], [9, 10, 5, 21, 3].paginateIt(3), paginateIt([9, 10, 5, 21, 3], 3));
   agree([[1, 3], [6, 8]], [1, 3, 6, 8].evenlySplit(2), evenlySplit([1, 3, 6, 8], 2));
   agree([[9, 10], [5, 21], [3]], [9, 10, 5, 21, 3].evenlySplit(2), evenlySplit([9, 10, 5, 21, 3], 2));
   agree([[9], [10, 5], [21, 3]], [9, 10, 5, 21, 3].evenlySplit(2, false), evenlySplit([9, 10, 5, 21, 3], 2, false));
   agree({ 0: [6, 8], 1: [1, 3] }, [1, 3, 6, 8].groupItBy((value) => value % 2), groupItBy([1, 3, 6, 8], (value) => value % 2));
   assert.deepEqual([1, 3, 6, 8].groupItByP((value) => value % 2).get(0), [6, 8]);
   assert.deepEqual(groupItByP([1, 3, 6, 8], (value) => value % 2).get(0), [6, 8]);
});

test("remove, flatten, and search without mutating the source", () => {
   const source = [9, 10, 5, 21, 3];
   agree([10, 5, 3], source.removeIndex(0, 3), removeIndex(source.slice(), 0, 3));
   assert.deepEqual(source, [9, 10, 5, 21, 3]);
   const ones = [1, 1, 3, 1, 5, 1];
   agree([3, 5], ones.removeValue(1), removeValue(ones.slice(), 1));
   agree([3, 1, 5, 1], ones.removeValue(1, 2), removeValue(ones.slice(), 1, 2));
   agree([9, 21, 3], source.removeValue((value) => value % 5 === 0), removeValue(source.slice(), (value) => value % 5 === 0));
   agree([1, 2, [3], 4, 5], [1, [2, [3]], [4, 5]].legacyFlat(), legacyFlat([1, [2, [3]], [4, 5]]));
   agree([1, 2, 3, 4, 5], [1, [2, [3]], [4, 5]].legacyFlat(-1), legacyFlat([1, [2, [3]], [4, 5]], -1));
   for (const [value, index] of [[1, -1], [2, 0], [3, -2], [4, 1], [5, -3], [6, 2], [7, -4]])
      agree(index, [2, 4, 6].searchSorted(value), searchSorted([2, 4, 6], value));
   for (const [value, expected] of [[1, [1, 2, 4, 6]], [2, [2, 2, 4, 6]], [3, [2, 3, 4, 6]], [4, [2, 4, 4, 6]], [5, [2, 4, 5, 6]], [6, [2, 4, 6, 6]], [7, [2, 4, 6, 7]]]) {
      const proto = [2, 4, 6];
      const dispatched = [2, 4, 6];
      proto.sortedInsert(value);
      sortedInsert(dispatched, value);
      assert.deepEqual(proto, expected);
      assert.deepEqual(dispatched, expected);
   }
});

test("zip stops on the documented end conditions and keeps undefined holes", () => {
   const left = [1, 2, 3];
   const right = [4, 5, 6, 7];
   const full = [[1, 4], [2, 5], [3, 6], [undefined, 7]];
   agree(full, Array.justZip(left, right), justZip(left, right));
   agree([[1, 4], [2, 5]], Array.zipIt(2, left, right), zipIt(2, left, right));
   agree([...full, [undefined, undefined]], Array.zipIt(5, left, right), zipIt(5, left, right));
   agree([[1, 4], [2, 5], [3, 6]], Array.zipIt(({ endCount }) => endCount === 0, left, right), zipIt(({ endCount }) => endCount === 0, left, right));
   agree([[1, 4, 2], [undefined, 5, 3]], Array.zipIt(({ endTruths }) => (endTruths & 0b10) === 0, [1], [4, 5], [2, 3, 7]), zipIt(({ endTruths }) => (endTruths & 0b10) === 0, [1], [4, 5], [2, 3, 7]));
   assert.deepEqual(rows(Array.zipItr(left, right)), full);
   assert.deepEqual(rows(zipItr(left, right)), full);
   assert.deepEqual(rows(Array.zipItr(left, right), (state) => state.endCount === 0), [[1, 4], [2, 5], [3, 6]]);
   assert.deepEqual(rows(zipItr(left, right), (state) => state.endCount === 0), [[1, 4], [2, 5], [3, 6]]);
   const weight = (res, values) => res + (values[0] ? values[0] : 0) + (values[1] ? values[1] : 0) * 2 + (values[2] ? values[2] : 0) * 3;
   const options = { cond: ({ endTruths }) => (endTruths & 0b10) === 0, d0: weight };
   assert.equal(Array.zipItr([1], [4, 5], [2, 3, 7]).reduce(options, 0), 34);
   assert.equal(zipItr([1], [4, 5], [2, 3, 7]).reduce(options, 0), 34);
   const summed = { cond: ({ endCount }) => endCount !== 2, d0: (values) => (values[0] ? values[0] : 0) + (values[1] ? values[1] : 0) + (values[2] ? values[2] : 0) };
   assert.deepEqual(Array.zipItr([1], [4, 5], [2, 3, 7]).map(summed), [7, 8]);
   assert.deepEqual(zipItr([1], [4, 5], [2, 3, 7]).map(summed), [7, 8]);
});

test("indexes sort numerically, empty pages throw, and __proto__ stays countable", () => {
   agree([0, 1, 3, 4, 5, 6, 7, 8, 9, 11], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].removeIndex(10, 2), removeIndex([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 10, 2));
   assert.throws(() => [1].paginateIt(0), /pageSize must be an integer greater than 0/);
   assert.throws(() => paginateIt([1], 0), /pageSize must be an integer greater than 0/);
   assert.throws(() => [1, 2].evenlySplit(0), /split must be an integer greater than 0/);
   assert.throws(() => evenlySplit([1, 2], 0), /split must be an integer greater than 0/);
   assert.throws(() => [1].evenlySplit(2), /page size must be an integer greater than 0/);
   agree([1, 2], [1, null, 2, null].removeValue(null), removeValue([1, null, 2, null], null));
   const counted = ["__proto__", "__proto__"].countItBy();
   const dispatched = countItBy(["__proto__", "__proto__"]);
   assert.equal(Object.getPrototypeOf(counted), Object.prototype);
   assert.equal(Object.getPrototypeOf(dispatched), Object.prototype);
   assert.equal(counted["__proto__"], 2);
   assert.equal(dispatched["__proto__"], 2);
   assert.equal(Object.prototype[2], undefined);
   const grouped = ["__proto__"].groupItBy((value) => value);
   assert.equal(Object.getPrototypeOf(grouped), Object.prototype);
   assert.deepEqual(grouped["__proto__"], ["__proto__"]);
   assert.deepEqual(groupItBy(["__proto__"], (value) => value)["__proto__"], ["__proto__"]);
});

test("count and group results chain into object methods", () => {
   assert.deepEqual(["a", "a", "b"].countItBy().flipIt(), { 2: "a", 1: "b" });
   assert.deepEqual(flipIt(countItBy(["a", "a", "b"])), { 2: "a", 1: "b" });
   assert.deepEqual(Object.keys([1, 2, 3].groupItBy((value) => value % 2).filterIt(([, values]) => values.length > 1)), ["1"]);
});
