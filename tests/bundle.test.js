import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { rollup } from "rollup";
import { build as viteBuild } from "vite";
import webpack from "webpack";
import { rspack } from "@rspack/core";
import protoppEsbuild from "../plugin/esbuild.js";
import protoppRollup from "../plugin/rollup.js";
import protoppVite from "../plugin/vite.js";
import protoppWebpack from "../plugin/webpack.js";
import protoppRspack from "../plugin/rspack.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const expected = "{\"direct\":{\"1\":2,\"2\":1},\"lazy\":{\"a\":[\"a\",\"a\"],\"b\":[\"b\"]}}";

test("bundlers compile calls, drop unused methods, and run a lazy chunk", { timeout: 180000 }, async () => {
   for (const name of ["esbuild", "rollup", "vite", "webpack", "rspack"]) {
      const dir = fixture();
      await builders[name](dir, { dispatch: "safe" });
      const output = readTree(join(dir, "dist"));
      assert.equal(runModule(join(dir, "dist")), expected, name);
      assert.equal(output.includes("paginateIt"), false, name);
   }
   const trustedDir = fixture();
   await builders.esbuild(trustedDir, { dispatch: "trusted", minify: true });
   const trusted = readTree(join(trustedDir, "dist"));
   assert.equal(trusted.includes("countItBy"), false);
   const legacyDir = fixture("import \"@marthvon/protopp\";\n");
   await esbuild.build({
      absWorkingDir: legacyDir,
      entryPoints: [join(legacyDir, "main.js")],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: join(legacyDir, "dist", "main.js"),
      minify: true,
      define: { "process.env.NODE_ENV": "\"development\"" },
      plugins: [aliasPlugin()],
   });
   assert.ok(trusted.length * 20 < readTree(join(legacyDir, "dist")).length);
});

test("a production bundle that still imports the installer throws", { timeout: 60000 }, async () => {
   const dir = mkdtempSync(join(tmpdir(), "protopp-throw-"));
   writeFileSync(join(dir, "main.js"), "import \"@marthvon/protopp\";\n");
   await esbuild.build({
      absWorkingDir: dir,
      entryPoints: [join(dir, "main.js")],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: join(dir, "out.js"),
      define: { "process.env.NODE_ENV": "\"production\"" },
      plugins: [aliasPlugin()],
   });
   const ran = spawnSync(process.execPath, [join(dir, "out.js")], { encoding: "utf8" });
   assert.notEqual(ran.status, 0);
   assert.match(`${ran.stderr}`, /production is still loading the prototype installer/);
});

test("node --import runs the same transform", { timeout: 60000 }, () => {
   const dir = mkdtempSync(join(tmpdir(), "protopp-register-"));
   mkdirSync(join(dir, "node_modules", "@marthvon"), { recursive: true });
   symlinkSync(root, join(dir, "node_modules", "@marthvon", "protopp"));
   writeFileSync(join(dir, "package.json"), "{\"type\":\"module\"}\n");
   writeFileSync(join(dir, "app.js"), "console.log(JSON.stringify([1, 1].countItBy()));\n");
   const ran = spawnSync(process.execPath, ["--import", "@marthvon/protopp/register", join(dir, "app.js")], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "development" },
   });
   assert.equal(ran.status, 0, ran.stderr);
   assert.equal(ran.stdout.trim(), "{\"1\":2}");
});

const builders = {
   async esbuild(dir, options) {
      await esbuild.build({
         absWorkingDir: dir,
         entryPoints: [join(dir, "main.js")],
         bundle: true,
         format: "esm",
         platform: "node",
         outdir: join(dir, "dist"),
         splitting: true,
         minify: options.minify === true,
         define: { "process.env.NODE_ENV": "\"development\"" },
         plugins: [aliasPlugin(), protoppEsbuild({ dispatch: options.dispatch })],
      });
   },
   async rollup(dir, options) {
      const bundle = await rollup({
         input: join(dir, "main.js"),
         plugins: [protoppRollup({ dispatch: options.dispatch }), aliasRollup()],
      });
      await bundle.write({ dir: join(dir, "dist"), format: "es" });
      await bundle.close();
   },
   async vite(dir, options) {
      await viteBuild({
         root: dir,
         configFile: false,
         logLevel: "silent",
         plugins: [protoppVite({ dispatch: options.dispatch }), aliasRollup()],
         build: {
            outDir: join(dir, "dist"),
            ssr: join(dir, "main.js"),
            minify: false,
            emptyOutDir: true,
         },
      });
   },
   webpack(dir, options) {
      return compileWebpack(webpack, dir, options, protoppWebpack({ dispatch: options.dispatch }));
   },
   rspack(dir, options) {
      return compileWebpack(rspack, dir, options, protoppRspack({ dispatch: options.dispatch }));
   },
};

function compileWebpack(compile, dir, options, plugin) {
   return new Promise((done, reject) => {
      compile({
         mode: "production",
         context: dir,
         entry: join(dir, "main.js"),
         output: { path: join(dir, "dist"), filename: "main.js", module: true, library: { type: "module" } },
         experiments: { outputModule: true },
         optimization: { minimize: false },
         plugins: [plugin],
         resolve: { alias: { "@marthvon/protopp": join(root, "min") } },
      }, (error, stats) => {
         if (error) reject(error);
         else if (stats.hasErrors()) reject(new Error(stats.toJson().errors.map((item) => item.message).join("\n")));
         else done();
      });
   });
}

function fixture(prefix = "") {
   const dir = mkdtempSync(join(tmpdir(), "protopp-bundle-"));
   writeFileSync(join(dir, "main.js"), `${prefix}const direct = [1, 1, 2].countItBy();\nimport("./lazy.js").then((lazy) => {\n   console.log(JSON.stringify({ direct, lazy: lazy.later() }));\n});\n`);
   writeFileSync(join(dir, "lazy.js"), "export function later() {\n   return [\"a\", \"b\", \"a\"].groupItBy((value) => value);\n}\n");
   return dir;
}

function aliasPlugin() {
   return {
      name: "protopp-alias",
      setup(build) {
         build.onResolve({ filter: /^@marthvon\/protopp/ }, (args) => ({ path: resolveProtopp(args.path) }));
      },
   };
}

function aliasRollup() {
   return {
      name: "protopp-alias",
      resolveId(id) {
         if (id.startsWith("@marthvon/protopp")) return resolveProtopp(id);
         return null;
      },
   };
}

function resolveProtopp(id) {
   if (id === "@marthvon/protopp") return join(root, "min", "index.js");
   const sub = id.slice("@marthvon/protopp/".length);
   const plugins = new Set(["vite", "rollup", "webpack", "esbuild", "rspack", "loader", "register"]);
   if (plugins.has(sub)) return join(root, "plugin", `${sub}.js`);
   return join(root, "min", sub.endsWith(".js") ? sub : `${sub}.js`);
}

function readTree(dir) {
   let text = "";
   for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) text += readTree(full);
      else text += readFileSync(full, "utf8");
   }
   return text;
}

function runModule(dir) {
   const entry = readdirSync(dir).find((name) => name.startsWith("main"));
   const ran = spawnSync(process.execPath, [join(dir, entry)], { encoding: "utf8" });
   assert.equal(ran.status, 0, ran.stderr);
   return ran.stdout.trim();
}
