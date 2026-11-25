import { transform } from "./core/transform.js";
import { isGuardId, loadManifest, normalize } from "./core/options.js";

const manifest = loadManifest(new URL("../manifest.json", import.meta.url));

export default function protoppLoader(source) {
   const settings = normalize(this.query ?? {}, manifest);
   const file = this.resourcePath;
   if (settings.legacy && isGuardId(file)) {
      this.callback(null, "export {}\n");
      return;
   }
   const result = transform(String(source), file, settings);
   if (result?.errors?.length && settings.unbound === "error") {
      this.callback(new Error(result.errors.join("\n")));
      return;
   }
   for (const warning of result?.warnings ?? []) this.emitWarning(new Error(warning));
   for (const warning of result?.errors ?? []) this.emitWarning(new Error(warning));
   if (!result?.code) {
      this.callback(null, source);
      return;
   }
   this.callback(null, result.code, result.map ?? undefined);
}
