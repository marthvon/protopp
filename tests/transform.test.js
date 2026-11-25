import assert from "node:assert/strict";
import test from "node:test";
import { transform } from "../plugin/core/transform.js";
import { loadManifest } from "../plugin/core/options.js";

const manifest = loadManifest(new URL("../manifest.json", import.meta.url));

function compile(code, options = {}) {
   return transform(code, "fixture.js", {
      manifest,
      dispatch: "safe",
      unbound: "error",
      legacy: false,
      root: new URL("..", import.meta.url).pathname,
      ...options,
   });
}

test("rewrites a call, a computed call, and a chain", () => {
   const result = compile("export const value = a.groupItBy(f).paginateIt(3);\nexport const keyed = x[\"countItBy\"](a);\n");
   assert.match(result.code, /__pp_paginateIt\(__pp_groupItBy\(a, f\), 3\)/);
   assert.match(result.code, /__pp_countItBy\(x, a\)/);
   assert.match(result.code, /from "@marthvon\/protopp\/runtime\/array\/groupItBy\.js"/);
   assert.match(result.code, /from "@marthvon\/protopp\/runtime\/array\/paginateIt\.js"/);
   assert.doesNotMatch(result.code, /runtime\/index/);
});

test("optional receiver uses opt and optional call does not", () => {
   const result = compile("export const a = x?.countItBy(1);\nexport const b = x.countItBy?.(2);\n");
   assert.match(result.code, /__pp_opt\(x, __pp_countItBy, 1\)/);
   assert.match(result.code, /__pp_countItBy\(x, 2\)/);
   assert.match(result.code, /import \{ opt as __pp_opt \}/);
});

test("rewrites real globals and statics only", () => {
   const result = compile("export const zipped = Array.justZip(a, b);\nexport const ran = runIt(f);\n");
   assert.match(result.code, /__pp_justZip\(a, b\)/);
   assert.match(result.code, /__pp_runIt\(f\)/);
   const shadowed = compile("function demo(Array, runIt) {\n   return [Array.justZip(a, b), runIt(f)];\n}\n");
   assert.equal(shadowed, null);
});

test("removes the legacy installer import unless legacy is enabled", () => {
   const removed = compile("import \"@marthvon/protopp\";\nimport \"@marthvon/protopp/objectpp/methods/copyOnly.js\";\nexport const value = obj.copyOnly(\"a\");\n");
   assert.doesNotMatch(removed.code, /import "@marthvon\/protopp"/);
   assert.match(removed.code, /__pp_copyOnly\(obj, "a"\)/);
   const kept = compile("import \"@marthvon/protopp\";\nexport const value = obj.copyOnly(\"a\");\n", { legacy: true });
   assert.match(kept.code, /import "@marthvon\/protopp";/);
});

test("does not rewrite assignment, delete, new, definitions, super, or dynamic keys", () => {
   const source = [
      "class Child extends Array {",
      "   countItBy() { return 1; }",
      "   viaSuper() { return super.countItBy(); }",
      "   make() { return new this.countItBy(); }",
      "}",
      "x.countItBy = 1;",
      "delete x.countItBy;",
      "const name = \"countItBy\";",
      "x[name]();",
   ].join("\n");
   assert.equal(compile(source), null);
});

test("reports an unbound reference and suffixes a colliding local", () => {
   const unbound = compile("export const fn = arr.countItBy;\n");
   assert.match(unbound.errors[0], /cannot compile countItBy/);
   const collision = compile("const __pp_countItBy = 1;\nexport const value = arr.countItBy();\n");
   assert.match(collision.code, /__pp_countItBy1\(arr\)/);
   assert.match(collision.code, /as __pp_countItBy1/);
});

test("trusted dispatch calls the implementation directly", () => {
   const result = compile("export const value = arr.countItBy();\n", { dispatch: "trusted" });
   assert.match(result.code, /__pp_countItBy\.call\(arr\)/);
   assert.match(result.code, /from "@marthvon\/protopp\/_impl\/arraypp\/methods\/countItBy\.js"/);
   assert.doesNotMatch(result.code, /runtime\/array\/countItBy/);
});
