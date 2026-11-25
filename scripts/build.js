import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, sep } from "node:path";
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

for (const folder of ["_impl", "classpp", "modulepp"]) {
   const dir = join(minDir, folder);
   if (!existsSync(dir)) continue;
   for (const file of walkJs(dir)) await rewrite(file);
}

for (const file of walkJs(minDir)) {
   if (file.endsWith(`${sep}guard.js`)) continue;
   const source = readFileSync(file, "utf8");
   const result = await minify(source, { ecma: 2020, module: true, compress: true, mangle: true });
   writeFileSync(file, result.code || "\n");
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

function walkJs(dir) {
   const files = [];
   for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walkJs(full));
      else if (entry.name.endsWith(".js")) files.push(full);
   }
   return files;
}
