# Prototype plus plus
*(ppp.js, an extra p for the girthiest npm package that exists)*

Utility methods you call as `arr.countItBy().paginateIt(10)`. One package ships the runtime and the build plugin.

```bash
npm install @marthvon/protopp
```

AI coding agents: read [AI_GUIDE.md](./AI_GUIDE.md) (also shipped in the package) before setting up or using protopp. It covers bundler setup, every method, the classes, and the `fetchExtra`, `indexExtra`, and `sealExtra` modules.

## Production

Add the plugin in every bundler that compiles application code. A production run that still loads the prototype installer throws. The plugin deletes `import "@marthvon/protopp"` and rewrites each call into a normal function import, in the same file, so a lazy chunk cannot run before its method exists. Dev and production use the same compiled calls when the plugin is configured.

Vite or SvelteKit:

```js
import protopp from "@marthvon/protopp/vite";

export default {
   plugins: [protopp()],
};
```

The plugin runs after Svelte and Vue have compiled their files to JavaScript, including during `vite dev`.

Rollup: `@marthvon/protopp/rollup`. esbuild: `@marthvon/protopp/esbuild`. webpack: `@marthvon/protopp/webpack`. Rspack: `@marthvon/protopp/rspack`.

Next.js, both bundlers:

```js
import protopp from "@marthvon/protopp/webpack";

export default {
   webpack(config) {
      config.plugins.push(protopp());
      return config;
   },
   turbopack: {
      rules: { "*.{js,jsx,ts,tsx}": { loaders: ["@marthvon/protopp/loader"] } },
   },
};
```

Node scripts and tests:

```bash
node --import @marthvon/protopp/register app.js
```

Without that hook, `NODE_ENV=production` still evaluates the installer and throws. Leave `NODE_ENV` unset for a local script that only imports `@marthvon/protopp`.

Libraries that call these methods must run the plugin before publishing. The default `exclude` skips `node_modules`, because dependencies are expected to already be compiled. A dependency that still contains `.countItBy()` calls has to be opted in through `include`.

A minified sample that calls `countItBy` and `groupItBy` is 372 bytes with `dispatch: "trusted"`. The same program, minified while still importing the installer, is 117 KB because that import installs every method.

## Calls the plugin does not rewrite

A method taken as a value (`arr.countItBy`, `.bind`, `.call`, `.apply`, passing it into `map`) fails the build. The default is `unbound: "error"`. Write `(...args) => arr.countItBy(...args)` instead. `unbound: "warn"` continues the build. `legacy: true` keeps the installer import so those references still work, including in production.

`x[name]()` is left as it is. It only works with `legacy: true`.

`dispatch: "trusted"` compiles `x.countItBy(a)` to `countItBy.call(x, a)` and drops the method-name string. Use it only when no other object in the compiled files has a method with a protopp name.

`Object.create(null)` can reach an object method. In 1.x the call threw because the method was not on the prototype chain. A method that checks `this.constructor === Object`, such as `copyOnly`, still throws from its own body.

## Dev without the plugin

Import `@marthvon/protopp` once, at the top of the earliest module that actually runs on each runtime where you call a method. Do not import it only inside a lazy-loaded component.

SvelteKit has no hooks file that runs on both sides. `src/hooks.server.js` is server-only and `src/hooks.client.js` is browser-only. For pages, import at the top of `src/routes/+layout.js`, or in the script of `src/routes/+layout.svelte`. A `+server.js` route that never loads the layout also needs the import at the top of `src/hooks.server.js`.

Next.js does not run the root layout in the browser. Add a client module whose only job is `import "@marthvon/protopp"` and render it from the root layout. Next evaluates that module during SSR and again in the browser. Route handlers also need the import in `instrumentation.js`, inside `register`. `instrumentation-client.js` is only the browser entry. Pair it with `instrumentation.js`.

One method at a time:

```js
import "@marthvon/protopp/objectpp/methods/copyOnly.js";
```

```js
({ a: 1, b: 2, c: 3 }).copyOnly("a", "c");
```

Learn more: https://marthvon-solution.tech/docs/protopp
