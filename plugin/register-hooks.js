import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extname } from "node:path";
import { transform } from "./core/transform.js";
import { loadManifest, normalize } from "./core/options.js";

const manifest = loadManifest(new URL("../manifest.json", import.meta.url));
const settings = normalize({}, manifest);
const packageRoot = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
const sourceExts = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx"]);

export async function load(url, context, nextLoad) {
   if (!url.startsWith("file:")) return nextLoad(url, context);
   const file = fileURLToPath(url);
   if (!shouldTransform(file)) return nextLoad(url, context);
   if (/\.(?:[cm]?ts|tsx|jsx)$/.test(file)) return finish(file, readFileSync(file, "utf8"), "module");
   const result = await nextLoad(url, context);
   if (result.format !== "module" && result.format !== "commonjs") return result;
   const source = typeof result.source === "string" ? result.source : result.source ? Buffer.from(result.source).toString("utf8") : "";
   if (!source) return result;
   return finish(file, source, result.format);
}

function shouldTransform(file) {
   if (!sourceExts.has(extname(file))) return false;
   const real = realpathSync(file);
   if (real.startsWith(packageRoot)) return false;
   if (real.split("\\").join("/").includes("/node_modules/")) return false;
   return true;
}

function finish(file, source, format) {
   const result = transform(source, file, settings);
   if (result?.errors?.length) throw new Error(result.errors.join("\n"));
   if (!result?.code) return { format, source, shortCircuit: true };
   return { format, source: result.code, shortCircuit: true };
}
