import assert from "node:assert/strict";
import test from "node:test";
import SuppressedError from "../../src/classpp/SuppressedError.js";
import "../../src/errorpp/index.js";
import { safeCatch } from "../../min/runtime/error/safeCatch.js";
import { suppressedThrow } from "../../min/runtime/error/suppressedThrow.js";

test("topRecovered assigns the trimmed message and iteration does not reverse the stack", () => {
   const err = new SuppressedError(new Error("first"), new Error("second"));
   const order = () => err.errorStack.map((item) => item.message);
   assert.deepEqual(order(), ["second", "first"]);
   const seen = [];
   err.forEach((item) => seen.push(item.message));
   err.forEach((item) => seen.push(item.message));
   assert.deepEqual(seen, ["first", "second", "first", "second"]);
   assert.deepEqual(err.map((item) => item.message), ["first", "second"]);
   assert.deepEqual(order(), ["second", "first"]);
   assert.equal(err.message, "first\n\nsecond");
   assert.equal(err.topRecovered(), err);
   assert.deepEqual(order(), ["second"]);
   assert.equal(err.message, "second");
   err.suppressed(new Error("third"));
   assert.equal(err.message, "third\n\nsecond");
   assert.equal(err.handleTop().message, "third");
});

test("errors thrown by protopp are instances of the class users import", async () => {
   const { default: Published } = await import("../../min/classpp/SuppressedError.js");
   assert.throws(() => safeCatch(new Error("root"), () => { throw new Error("inner"); }), Published);
   assert.throws(() => suppressedThrow(new Error("root"), new Error("extra")), Published);
});

test("safeCatch and suppressedThrow keep both errors", () => {
   const root = new Error("root");
   assert.throws(() => root.safeCatch(() => { throw new Error("inner"); }), (error) => {
      assert.ok(error instanceof SuppressedError);
      assert.match(error.message, /inner/);
      assert.match(error.message, /root/);
      return true;
   });
   assert.throws(() => safeCatch(new Error("root"), () => { throw new Error("inner"); }), (error) => {
      assert.equal(error.name, "SuppressedError");
      assert.match(error.message, /inner/);
      assert.match(error.message, /root/);
      return true;
   });
   assert.throws(() => new Error("root").suppressedThrow(new Error("extra")), SuppressedError);
   assert.throws(() => suppressedThrow(new Error("root"), new Error("extra")), (error) => {
      assert.equal(error.name, "SuppressedError");
      assert.match(error.message, /extra/);
      assert.match(error.message, /root/);
      return true;
   });
});
