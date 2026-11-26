import { createUnplugin } from "unplugin";
import { transform } from "./core/transform.js";
import { cleanId, createFilter, isCompiledOutput, isGuardId, isImplOutput, loadManifest, normalize } from "./core/options.js";

const manifest = loadManifest(new URL("../manifest.json", import.meta.url));

const protopp = createUnplugin((options = {}) => {
   const settings = normalize(options, manifest);
   const filter = createFilter(settings.include, settings.exclude);
   return {
      name: "protopp",
      enforce: "post",
      vite: {
         configResolved(config) {
            if (options.devThrows !== undefined) return;
            else if (config.command === "serve") settings.devThrows = true;
            else if (config.command === "build") settings.devThrows = false;
         },
      },
      transformInclude(id) {
         const file = cleanId(id);
         if (settings.legacy && isGuardId(file)) return true;
         if (settings.devThrows === false && isImplOutput(file)) return true;
         if (isCompiledOutput(file)) return false;
         return filter(file);
      },
      transform(code, id) {
         const file = cleanId(id);
         if (settings.legacy && isGuardId(file) && code.includes("production is still loading the prototype installer"))
            return { code: "export {}\n", map: null };
         const result = transform(code, file, settings);
         if (!result) return null;
         for (const warning of result.warnings) this.warn(warning);
         if (result.errors.length) {
            const message = result.errors.join("\n");
            if (settings.unbound === "error") {
               this.error(message);
               throw new Error(message);
            }
            this.warn(message);
         }
         if (!result.code) return null;
         return { code: result.code, map: result.map };
      },
   };
});

export default protopp;
