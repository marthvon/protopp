import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { transform } from "../plugin/core/transform.js";
import { loadManifest } from "../plugin/core/options.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = loadManifest(new URL("../manifest.json", import.meta.url));
const files = [
   "tests/index.js",
];

for (const file of files) {
   test(file, () => {
      const legacy = run(process.execPath, [join(root, file)], { NODE_ENV: "development" });
      assert.equal(legacy.status, 0, legacy.stderr);
      const compiledPath = join(mkdtempSync(join(tmpdir(), "protopp-")), "case.js");
      const source = readFileSync(join(root, file), "utf8").replace(/^\s*import\s+['"][^'"]*src\/[^'"]*['"];?\s*$/gm, "");
      const result = transform(source, compiledPath, {
         manifest,
         dispatch: "safe",
         unbound: "error",
         legacy: false,
         fromFile: compiledPath,
         root,
      });
      if (result?.errors?.length) assert.fail(result.errors.join("\n"));
      writeFileSync(compiledPath, result?.code ?? source);
      const compiled = run(process.execPath, [compiledPath], { NODE_ENV: "development" });
      assert.equal(compiled.status, 0, compiled.stderr);
      assert.equal(normalize(compiled.stdout), normalize(legacy.stdout));
   });
}

function normalize(stdout) {
   return stdout.replace(/lineNoHere => -?\d+/g, "lineNoHere => N");
}

function run(command, args, env) {
   return spawnSync(command, args, {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ...env },
   });
}
