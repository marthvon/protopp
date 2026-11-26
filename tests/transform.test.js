import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { transform } from "../plugin/core/transform.js";
import { loadManifest } from "../plugin/core/options.js";

const manifest = loadManifest(new URL("../manifest.json", import.meta.url));
const root = fileURLToPath(new URL("..", import.meta.url));

function compile(code, options = {}, id = "fixture.js") {
   return transform(code, id, {
      manifest,
      dispatch: "safe",
      unbound: "error",
      legacy: false,
      root,
      ...options,
   });
}

test("compiles calls nested under other calls, arrays, objects, and functions", () => {
   const result = compile([
      "export const a = y.countItBy(foo(x.paginateIt(1)));",
      "export const b = y.countItBy([x.paginateIt(1)]);",
      "export const c = y.countItBy(() => x.paginateIt(1));",
      "export const d = y.countItBy({ k: x.paginateIt(1) }).flipIt();",
   ].join("\n"));
   assert.doesNotMatch(result.code, /\.paginateIt\(/);
   assert.equal(result.code.match(/__pp_paginateIt\(x, 1\)/g).length, 4);
});

test("an optional receiver keeps short-circuiting the rest of the chain", () => {
   const result = compile([
      "export const a = x?.paginateIt(2).length;",
      "export const b = x?.paginateIt(2)[0];",
      "export const c = x?.paginateIt(2).map((page) => page.countItBy());",
      "export const d = y.countItBy(x?.paginateIt(2).length);",
      "export const e = x?.paginateIt(2).countItBy();",
   ].join("\n"));
   assert.match(result.code, /a = __pp_opt\(x, __pp_paginateIt, 2\)\?\.length/);
   assert.match(result.code, /b = __pp_opt\(x, __pp_paginateIt, 2\)\?\.\[0\]/);
   assert.match(result.code, /c = __pp_opt\(x, __pp_paginateIt, 2\)\?\.map\(\(page\) => __pp_countItBy\(page\)\)/);
   assert.match(result.code, /d = __pp_countItBy\(y, __pp_opt\(x, __pp_paginateIt, 2\)\?\.length\)/);
   assert.match(result.code, /e = __pp_opt\(__pp_opt\(x, __pp_paginateIt, 2\), __pp_countItBy\)/);
});

test("compiled nested and optional calls run like the source", () => {
   const file = join(mkdtempSync(join(tmpdir(), "protopp-run-")), "case.js");
   const source = [
      "const none = null;",
      "const list = [1, 2, 3, 4, 5];",
      "console.log(JSON.stringify([",
      "   none?.paginateIt(2).length,",
      "   list?.paginateIt(2).length,",
      "   none?.paginateIt(2)[0],",
      "   list.paginateIt(2).map((page) => page.countItBy()),",
      "   [list].map((inner) => inner.paginateIt(4))[0].length,",
      "   ['a', 'b', 'a'].groupItBy((value) => [value].countItBy()[value]),",
      "]));",
   ].join("\n");
   const result = compile(source, { fromFile: file }, file);
   writeFileSync(file, result.code);
   const ran = spawnSync(process.execPath, [file], { encoding: "utf8" });
   assert.equal(ran.status, 0, ran.stderr);
   assert.equal(ran.stdout.trim(), JSON.stringify([null, 3, null, [{ 1: 1, 2: 1 }, { 3: 1, 4: 1 }, { 5: 1 }], 2, { 1: ["a", "b", "a"] }]));
});

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

test("keeps a marked receiver throw in development and drops only that statement in production", () => {
   const source = [
      "export function copyOnly(...only) {",
      "   /* DEV START */",
      "   if(this.constructor !== Object)",
      "      throw new Error(\"copyOnly can only be called by Object\");",
      "   /* DEV END */",
      "   return {};",
      "}",
      "export function isEquals(other) {",
      "   /* DEV START */",
      "   if(",
      "      this.constructor !== Object ||",
      "      other.constructor !== Object",
      "   )",
      "      throw new Error(\"isEquals only compares between two Objects\");",
      "   /* DEV END */",
      "   return true;",
      "}",
      "export function paginateIt(pageSize) {",
      "   if(!Number.isInteger(pageSize) || pageSize < 1)",
      "      throw new Error(\"paginateIt pageSize must be an integer greater than 0\");",
      "   return [];",
      "}",
   ].join("\n");
   const id = "/app/node_modules/@marthvon/protopp/min/_impl/objectpp/methods/copyOnly.js";
   const kept = compile(source, { devThrows: true }, id);
   assert.equal(kept, null);
   const stripped = compile(source, { devThrows: false }, id);
   assert.doesNotMatch(stripped.code, /copyOnly can only be called by Object/);
   assert.doesNotMatch(stripped.code, /isEquals only compares between two Objects/);
   assert.doesNotMatch(stripped.code, /DEV START|DEV END/);
   assert.match(stripped.code, /paginateIt pageSize must be an integer greater than 0/);
   assert.match(stripped.code, /return \{\}/);
   assert.match(stripped.code, /return true/);
});

test("trusted dispatch calls the implementation directly", () => {
   const result = compile("export const value = arr.countItBy();\n", { dispatch: "trusted" });
   assert.match(result.code, /__pp_countItBy\.call\(arr\)/);
   assert.match(result.code, /from "@marthvon\/protopp\/_impl\/arraypp\/methods\/countItBy\.js"/);
   assert.doesNotMatch(result.code, /runtime\/array\/countItBy/);
});
