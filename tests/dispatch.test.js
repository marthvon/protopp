import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { countItBy } from "../min/runtime/array/countItBy.js";
import { charAdd } from "../min/runtime/string/charAdd.js";
import { greaterThan } from "../min/runtime/number/greaterThan.js";
import { copyOnly } from "../min/runtime/object/copyOnly.js";

const root = fileURLToPath(new URL("..", import.meta.url));

test("dispatch matches a prototype call and rejects null", () => {
   assert.deepEqual({ ...countItBy([1, 1, 2]) }, { 1: 2, 2: 1 });
   assert.equal(Object.getPrototypeOf(countItBy([1, 1, 2])), Object.prototype);
   assert.throws(() => countItBy(null), TypeError);
   assert.throws(() => countItBy(undefined), TypeError);
});

test("an own method and an overriding subclass win", () => {
   class Box {
      countItBy() { return "own"; }
   }
   class Sub extends Array {
      countItBy() { return "sub"; }
   }
   assert.equal(countItBy(new Box()), "own");
   assert.equal(countItBy(new Sub()), "sub");
});

test("a method already sitting on the prototype does not replace protopp", () => {
   const previous = Object.getOwnPropertyDescriptor(Array.prototype, "countItBy");
   Object.defineProperty(Array.prototype, "countItBy", { value() { return "native"; }, configurable: true });
   try {
      assert.deepEqual({ ...countItBy([1, 1]) }, { 1: 2 });
   } finally {
      if (previous) Object.defineProperty(Array.prototype, "countItBy", previous);
      else delete Array.prototype.countItBy;
   }
});

test("string and number receivers include boxed objects", () => {
   assert.equal(charAdd("A", 1), "B");
   assert.equal(charAdd(new String("A"), 1), "B");
   assert.equal(greaterThan(2, 1), true);
   assert.equal(greaterThan(new Number(2), 1), true);
   assert.equal(greaterThan(1, 2), false);
});

test("object methods run on null-prototype objects when the body allows it", () => {
   assert.deepEqual(copyOnly({ a: 1, b: 2 }, "a"), { a: 1 });
   const naked = Object.create(null);
   naked.a = 1;
   assert.throws(() => copyOnly(naked, "a"), /copyOnly can only be called by Object/);
});

test("legacy installation and compiled calls agree", () => {
   const ran = spawnSync(process.execPath, ["--input-type=module", "-e", [
      "import './min/arraypp/methods/countItBy.js';",
      "import { countItBy } from './min/runtime/array/countItBy.js';",
      "console.log(JSON.stringify(countItBy([1, 1])));",
      "console.log(JSON.stringify([1, 1].countItBy()));",
   ].join("\n")], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "development" },
   });
   assert.equal(ran.status, 0, ran.stderr);
   assert.equal(ran.stdout, "{\"1\":2}\n{\"1\":2}\n");
});

test("production import of the installer throws before patching", () => {
   const ran = spawnSync(process.execPath, ["--input-type=module", "-e", "import './min/index.js';"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production" },
   });
   assert.notEqual(ran.status, 0);
   assert.match(`${ran.stderr}`, /production is still loading the prototype installer/);
});
