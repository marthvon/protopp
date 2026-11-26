import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";
import { parseSync } from "oxc-parser";
import { generate } from "./generate.js";
import { transform } from "../plugin/core/transform.js";
import { GUARD_MESSAGE } from "../plugin/core/options.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = generate(root);
const minDir = join(root, "min");
const legacy = new Set(manifest.legacy);

for (const file of walkJs(minDir)) {
   const rel = relative(minDir, file).split(sep).join("/");
   if (rel === "guard.js" || rel.startsWith("runtime/") || legacy.has(rel)) continue;
   await rewrite(file);
}

for (const file of walkJs(minDir)) {
   if (file.endsWith(`${sep}guard.js`)) continue;
   const source = readFileSync(file, "utf8");
   const result = await minify(source, {
      ecma: 2020,
      module: true,
      compress: true,
      mangle: true,
      format: { comments: /^\s*DEV (?:START|END)\s*$/ },
   });
   writeFileSync(file, result.code || "\n");
   checkDevRegions(file, result.code || "");
}

const guard = readFileSync(join(minDir, "guard.js"), "utf8");
if (!guard.includes("process.env.NODE_ENV") || !guard.includes(GUARD_MESSAGE))
   throw new Error("min/guard.js lost the production check");

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.sideEffects = [...legacy].map((rel) => `./min/${rel}`).concat("./min/guard.js").sort();
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`built ${manifest.methods.length} protopp methods`);

async function rewrite(file) {
   const source = readFileSync(file, "utf8");
   const result = transform(source, file, {
      manifest,
      dispatch: "safe",
      unbound: "error",
      legacy: false,
      fromFile: file,
      stripBareImports: true,
      root,
   });
   if (result?.errors?.length && !file.endsWith(`${sep}objectpp${sep}methods${sep}isEquals.js`))
      throw new Error(result.errors.join("\n"));
   const code = result?.code ?? source;
   const parsed = parseSync(file, code, { sourceType: "module", lang: "js" });
   if (parsed.errors?.length) throw new Error(`${file}: ${parsed.errors[0].message ?? JSON.stringify(parsed.errors[0])}\n${code}`);
   if (result?.code) writeFileSync(file, result.code);
}

function checkDevRegions(file, code) {
   const parsed = parseSync(file, code, { sourceType: "module", lang: "js" });
   const marks = (parsed.comments ?? []).filter((comment) => comment.type === "Block" && /^\s*DEV (?:START|END)\s*$/.test(comment.value));
   for (let index = 0; index < marks.length; index += 2) {
      const [open, close] = [marks[index], marks[index + 1]];
      if (open.value.trim() !== "DEV START" || close?.value.trim() !== "DEV END")
         throw new Error(`${file}: DEV START and DEV END are not paired after minification`);
      const inner = parseSync("region.js", `function region(){${code.slice(open.end, close.start)}}`, { sourceType: "module", lang: "js" });
      const body = inner.program.body[0]?.body?.body ?? [];
      if (inner.errors?.length || body.length !== 1 || body[0].type !== "IfStatement" || body[0].alternate || body[0].consequent.type !== "ThrowStatement")
         throw new Error(`${file}: a DEV region must hold exactly one if (...) throw statement after minification`);
   }
}

function walkJs(dir) {
   const files = [];
   for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walkJs(full));
      else if (entry.name.endsWith(".js")) files.push(full);
   }
   return files;
}
