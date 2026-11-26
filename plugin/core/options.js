import { readFileSync } from "node:fs";

export const GUARD_MESSAGE = "@marthvon/protopp: production is still loading the prototype installer, so the plugin did not transform this module. Add protopp() from @marthvon/protopp/vite, /webpack, /rollup, /esbuild, or /rspack. Turbopack uses the @marthvon/protopp/loader loader. Node scripts use node --import @marthvon/protopp/register.";

const PLUGIN_IDS = new Set(["vite", "rollup", "webpack", "esbuild", "rspack", "loader", "register"]);

export function loadManifest(url) {
   return JSON.parse(readFileSync(url, "utf8"));
}

export function normalize(options = {}, manifest) {
   if (options.dispatch !== undefined && options.dispatch !== "safe" && options.dispatch !== "trusted")
      throw new Error(`protopp dispatch must be "safe" or "trusted", got ${options.dispatch}`);
   if (options.unbound !== undefined && options.unbound !== "error" && options.unbound !== "warn")
      throw new Error(`protopp unbound must be "error" or "warn", got ${options.unbound}`);
   return {
      manifest,
      dispatch: options.dispatch ?? "safe",
      unbound: options.unbound ?? "error",
      legacy: options.legacy ?? false,
      devThrows: options.devThrows ?? process.env.NODE_ENV !== "production",
      fromFile: options.fromFile ?? null,
      stripBareImports: options.stripBareImports ?? false,
      root: options.root ?? null,
      include: options.include ?? /\.(?:[cm]?js|[cm]?ts|jsx|tsx|svelte|vue)$/,
      exclude: options.exclude ?? /\/node_modules\//,
   };
}

export function createFilter(include, exclude) {
   return (id) => {
      if (matches(exclude, id)) return false;
      if (include == null) return true;
      return matches(include, id);
   };
}

export function cleanId(id) {
   return id.split("?")[0].split("#")[0].replaceAll("\\", "/");
}

export function isGuardId(id) {
   return cleanId(id).endsWith("/protopp/min/guard.js");
}

export function isCompiledOutput(id) {
   const file = cleanId(id);
   return file.includes("/min/runtime/") || file.includes("/min/_impl/") || file.endsWith("/min/guard.js");
}

export function isImplOutput(id) {
   return /\/min\/(?:_impl|classpp|modulepp)\//.test(cleanId(id));
}

export function isLegacySpecifier(source, legacy) {
   if (source === "@marthvon/protopp") return true;
   if (!source.startsWith("@marthvon/protopp/")) return false;
   const sub = source.slice("@marthvon/protopp/".length);
   if (sub.startsWith("runtime/") || sub.startsWith("_impl/") || PLUGIN_IDS.has(sub)) return false;
   const withJs = sub.endsWith(".js") ? sub : `${sub}.js`;
   return legacy.has(withJs) || legacy.has(sub);
}

function matches(pattern, id) {
   if (pattern == null) return false;
   if (Array.isArray(pattern)) {
      for (const item of pattern) if (matches(item, id)) return true;
      return false;
   }
   if (typeof pattern === "function") return pattern(id);
   if (pattern instanceof RegExp) return pattern.test(id);
   return id.includes(String(pattern));
}
