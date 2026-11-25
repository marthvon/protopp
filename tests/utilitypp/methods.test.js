import assert from "node:assert/strict";
import test from "node:test";
import "../../src/utilitypp/index.js";
import { isClass as isClassOf } from "../../min/runtime/global/isClass.js";
import { isCustomClass as isCustomClassOf } from "../../min/runtime/global/isCustomClass.js";
import { lineNoHere as lineNoHereOf } from "../../min/runtime/global/lineNoHere.js";
import { nullCoalesce as nullCoalesceOf } from "../../min/runtime/global/nullCoalesce.js";

class MyClass {}

function agree(expected, actual, dispatched) {
   assert.equal(actual, expected);
   assert.equal(dispatched, expected);
}

test("classify values and coalesce only nullish inputs", () => {
   const first = lineNoHere();
   const second = lineNoHere();
   assert.equal(second, first + 1);
   const dispatchedLine = lineNoHereOf();
   assert.equal(lineNoHere(), dispatchedLine + 1);
   const plain = {};
   const list = [];
   const map = new Map();
   const set = new Set();
   const custom = new MyClass();
   const bare = Object.create(null);
   agree(false, isClass(plain), isClassOf(plain));
   agree(false, isClass(list), isClassOf(list));
   agree(true, isClass(set), isClassOf(set));
   agree(true, isClass(map), isClassOf(map));
   agree(true, isClass(custom), isClassOf(custom));
   agree(false, isClass(bare), isClassOf(bare));
   agree(false, isCustomClass(plain), isCustomClassOf(plain));
   agree(false, isCustomClass(list), isCustomClassOf(list));
   agree(false, isCustomClass(set), isCustomClassOf(set));
   agree(false, isCustomClass(map), isCustomClassOf(map));
   agree(true, isCustomClass(custom), isCustomClassOf(custom));
   agree(false, isCustomClass(bare), isCustomClassOf(bare));
   agree("alternative", nullCoalesce(undefined, "alternative"), nullCoalesceOf(undefined, "alternative"));
   agree("alternative", nullCoalesce(null, "alternative"), nullCoalesceOf(null, "alternative"));
   agree(0, nullCoalesce(0, "alternative"), nullCoalesceOf(0, "alternative"));
   agree("", nullCoalesce("", "alternative"), nullCoalesceOf("", "alternative"));
});
