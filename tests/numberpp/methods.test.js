import assert from "node:assert/strict";
import test from "node:test";
import "../../src/numberpp/index.js";
import { floorP } from "../../min/runtime/math/floorP.js";
import { fract } from "../../min/runtime/math/fract.js";
import { fractP } from "../../min/runtime/math/fractP.js";
import { approximate } from "../../min/runtime/number/approximate.js";
import { atLeast } from "../../min/runtime/number/atLeast.js";
import { atMost } from "../../min/runtime/number/atMost.js";
import { greaterThan } from "../../min/runtime/number/greaterThan.js";
import { isEquals } from "../../min/runtime/shared/isEquals.js";
import { lessThan } from "../../min/runtime/number/lessThan.js";

const nearThird = 0.2 + 0.1;
const nearNine = 0.3 + 0.6;

function agree(expected, actual, dispatched) {
   assert.equal(actual, expected);
   assert.equal(dispatched, expected);
}

test("number comparisons absorb the documented floating point error", () => {
   agree(true, nearThird.isEquals(0.3), isEquals(nearThird, 0.3));
   agree(true, nearNine.isEquals(0.9), isEquals(nearNine, 0.9));
   agree(false, nearThird.greaterThan(0.3), greaterThan(nearThird, 0.3));
   agree(false, nearNine.lessThan(0.9), lessThan(nearNine, 0.9));
   agree(true, (0.3).atLeast(nearThird), atLeast(0.3, nearThird));
   agree(true, (0.9).atMost(nearNine), atMost(0.9, nearNine));
   assert.equal(typeof nearThird.approximate(), "number");
   assert.equal(typeof approximate(nearNine), "number");
});

test("printed floor and fraction match the old positive case and negative decimals", () => {
   agree(8, Math.floorP(nearNine * 9.99999999999), floorP(nearNine * 9.99999999999));
   agree(-2, Math.floorP(-1.2), floorP(-1.2));
   agree(Math.fract((0.1 + 0.2) * 10), (0.1 + 0.2) * 10 - Math.floor((0.1 + 0.2) * 10), fract((0.1 + 0.2) * 10));
   agree(-1.2 - Math.floorP(-1.2), Math.fractP(-1.2), fractP(-1.2));
   agree(1.5e21, Math.floorP(1.5e21), floorP(1.5e21));
});

test("approximate drops float noise and carries a run of nines into the whole part", () => {
   for (const [input, expected] of [[nearThird, 0.3], [5.9999, 6], [19.9999, 20], [99.9999, 100], [-9.9999, -10], [-5.9999, -6], [0.9999, 1], [1.2999, 1.3], [1.10003, 1.1], [7, 7]])
      agree(expected, input.approximate(), approximate(input));
});

test("null comparisons are false and significance outside 0 through 15 throws", () => {
   for (const other of [null, undefined]) {
      agree(false, (1).isEquals(other), isEquals(1, other));
      agree(false, (1).greaterThan(other), greaterThan(1, other));
      agree(false, (1).lessThan(other), lessThan(1, other));
      agree(false, (1).atLeast(other), atLeast(1, other));
      agree(false, (1).atMost(other), atMost(1, other));
   }
   assert.throws(() => (1.2).approximate(16), /significance/);
   assert.throws(() => approximate(1.2, 16), /significance/);
   assert.throws(() => (1.2).approximate(-1), /significance/);
   assert.throws(() => (1.2).approximate(1.5), /significance/);
});
