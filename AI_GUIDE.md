# protopp AI guide

Read this before you install `@marthvon/protopp` or write code that uses it. It is written for AI coding agents and matches protopp 2.0. Every rule below is enforced by the build or the runtime, and every snippet uses the shipped API.

1. [What protopp is](#1-what-protopp-is)
2. [Hard rules](#2-hard-rules)
3. [Setup](#3-setup)
4. [Writing protopp calls](#4-writing-protopp-calls)
5. [Method reference](#5-method-reference)
6. [Classes](#6-classes)
7. [fetchExtra: promise state instead of loading flags](#7-fetchextra-promise-state-instead-of-loading-flags)
8. [indexExtra: an indexed in-memory table](#8-indexextra-an-indexed-in-memory-table)
9. [sealExtra: encrypted persistence](#9-sealextra-encrypted-persistence)
10. [storageExtra: persistent client storage](#10-storageextra-persistent-client-storage)
11. [Recipes](#11-recipes)
12. [Troubleshooting](#12-troubleshooting)
13. [Working inside the protopp repository](#13-working-inside-the-protopp-repository)

## 1. What protopp is

protopp adds utility methods that read like built-ins: `arr.countItBy()`, `obj.deepMerge(other)`, `fn.debounce(200)`. One package ships two halves.

- **Runtime.** The method bodies, plus classes (`Lru`, `BTree`, `FetchManager`, …) and modules (`fetchExtra`, `indexExtra`, `sealExtra`, `storageExtra`) that you import as normal ES modules.
- **Build plugin** (`@marthvon/protopp/vite`, `/rollup`, `/webpack`, `/esbuild`, `/rspack`, `/loader`, `/register`). It rewrites `x.countItBy(a)` into an imported function call in the same file and deletes `import "@marthvon/protopp"`. A plugin build patches no prototype, tree-shakes unused methods, and lets the minifier rename every method.

Without the plugin, `import "@marthvon/protopp"` patches the prototypes. That mode is for development and tests only: when `NODE_ENV=production`, the import throws.

## 2. Hard rules

1. **Add the plugin to every bundler that compiles application code.** That includes the server and client builds, and both webpack and Turbopack in Next.js. A production bundle that still loads the installer throws at startup.
2. **Call protopp methods; never read them as values.** `arr.countItBy` without `()`, `typeof arr.countItBy`, `.bind`, `.call`, `.apply`, or `items.map(arr.countItBy)` fail the build. Write `(...args) => arr.countItBy(...args)`.
3. **Never call a protopp method through a computed name** such as `x[name]()`. The plugin cannot see it, so it only works with `legacy: true`.
4. **Keep `import "@marthvon/protopp";` in one entry module** even with the plugin. The plugin removes it from the output, and TypeScript needs it to load the method types (section 3.3).
5. **Do not give your own objects a method whose name matches a protopp method** unless you mean to override it. Safe dispatch calls the receiver's own method first. `dispatch: "trusted"` ignores it.
6. **A library that calls protopp methods must compile with the plugin before publishing.** Consumers' plugins skip `node_modules`.
7. **Import classes and modules by their deep path with the `.js` extension**, for example `@marthvon/protopp/modulepp/fetchExtra.js`.
8. **Never share a `fetchExtra` instance, an `indexExtra` table, or a `storageExtra` between users on a server.** Module state on a server is shared by every request (section 7.7).

## 3. Setup

### 3.1 Install

```bash
npm install @marthvon/protopp
```

The plugin needs Node `^20.19.0 || >=22.12.0`. The runtime needs an ES2022 engine (class fields, `Object.hasOwn`, `WeakRef`). `obj.diffIt()` needs `Set.prototype.intersection` (Node 22+, browsers since 2024). `sealExtra` needs WebCrypto: a secure context (https or localhost) in browsers, or Node 19+.

### 3.2 Add the plugin

| Stack | File | Plugin import |
|---|---|---|
| Vite, SvelteKit, Vitest | `vite.config.js` | `@marthvon/protopp/vite` |
| Rollup | `rollup.config.js` | `@marthvon/protopp/rollup` |
| esbuild | build script | `@marthvon/protopp/esbuild` |
| webpack | `webpack.config.js` | `@marthvon/protopp/webpack` |
| Rspack, Rsbuild | config | `@marthvon/protopp/rspack` |
| Next.js | `next.config.js` | `/webpack` and `/loader` (both, see below) |
| Node scripts, `node:test` | command line | `node --import @marthvon/protopp/register app.js` |

Vite and SvelteKit:

```js
import { sveltekit } from "@sveltejs/kit/vite";
import protopp from "@marthvon/protopp/vite";

export default {
   plugins: [sveltekit(), protopp()],
};
```

The Vite plugin runs after Svelte and Vue compile their files, including during `vite dev`. Vitest uses the same config.

Next.js covers both bundlers:

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

esbuild:

```js
import esbuild from "esbuild";
import protopp from "@marthvon/protopp/esbuild";

await esbuild.build({ entryPoints: ["src/main.js"], bundle: true, outdir: "dist", plugins: [protopp()] });
```

### 3.3 TypeScript

The method types are global augmentations in the package's main types entry, and TypeScript only loads them when the package is imported somewhere. Do one of these:

- keep `import "@marthvon/protopp";` in the entry module (the plugin deletes it from the build), or
- add `src/protopp.d.ts` with the line `/// <reference types="@marthvon/protopp" />`.

Classes and modules have their own declarations next to each deep import. Without one of the two steps above, TypeScript reports `Property 'countItBy' does not exist on type 'number[]'`.

### 3.4 Development and tests without the plugin

Import `@marthvon/protopp` once, at the top of the earliest module that runs on each runtime where methods are called. Never import it only inside a lazy-loaded component.

- **SvelteKit:** `src/routes/+layout.js` (or the layout's `<script>`), plus `src/hooks.server.js` when a `+server.js` route never loads the layout.
- **Next.js:** a client module whose only line is `import "@marthvon/protopp"`, rendered from the root layout. Route handlers also need the import inside `register` in `instrumentation.js`.
- **Jest:** protopp is ESM-only. Run Jest in native ESM mode and import `@marthvon/protopp` in a setup file, or use Vitest, which runs the Vite plugin.

Leave `NODE_ENV` unset, `development`, or `test` in this mode. To install one method only: `import "@marthvon/protopp/objectpp/methods/copyOnly.js";`.

### 3.5 Plugin options

```js
protopp({
   include: /\.(?:[cm]?js|[cm]?ts|jsx|tsx|svelte|vue)$/,
   exclude: /\/node_modules\//,
   dispatch: "safe",
   unbound: "error",
   legacy: false,
   devThrows: undefined,
});
```

| Option | Effect | Change it when |
|---|---|---|
| `include`, `exclude` | String, RegExp, array, or `(id) => boolean`. A file matching `exclude` is never compiled, even if it matches `include`. | A dependency ships raw protopp calls. Narrow `exclude` too, for example `exclude: /\/node_modules\/(?!raw-lib\/)/`. |
| `dispatch: "trusted"` | Compiles `x.countItBy(a)` to `countItBy.call(x, a)`: no type check, no method-name strings in the bundle. | No object in compiled code defines its own method with a protopp name, and types already guarantee the receiver. |
| `unbound: "warn"` | Unbound references warn instead of failing. | Only together with `legacy: true` while migrating. |
| `legacy: true` | Keeps the installer import, so prototypes are patched, and disables the production guard. | Migrating code that uses computed names or unbound references. |
| `devThrows` | `false` strips the checks marked as development-only: receiver checks in method bodies, and argument and option checks in `BTree`, `fetchExtra`, `indexExtra`, and `storageExtra`. Checks on data (unique conflicts, rows missing a primary key, snapshots, everything in `sealExtra`) always stay. | Defaults to `false` in Vite production builds. Other bundlers read `NODE_ENV` of the build process, so set `NODE_ENV=production` for the build or pass `devThrows: false`. |

### 3.6 Verify the setup

1. Build for production and run it. If the app starts, every bundler compiled the calls, because a leftover installer throws `@marthvon/protopp: production is still loading the prototype installer…`.
2. Open a lazily loaded route that calls protopp methods. Each compiled file imports its own helpers, so it must work without any global setup.
3. In TypeScript projects, run `tsc --noEmit`.

## 4. Writing protopp calls

| You write | The plugin emits | Notes |
|---|---|---|
| `x.countItBy(a)` | `countItBy(x, a)` | Helper imported into the same file. |
| `x["countItBy"](a)` | `countItBy(x, a)` | String-literal keys only. |
| `a.groupItBy(f).paginateIt(3)` | `paginateIt(groupItBy(a, f), 3)` | Chains and calls nested in arguments or callbacks all compile. |
| `x?.paginateIt(3).length` | `opt(x, paginateIt, 3)?.length` | The rest of the chain still short-circuits. |
| `x.countItBy?.(a)` | `countItBy(x, a)` | The method always exists once compiled. |
| `Array.justZip(a, b)` | `justZip(a, b)` | Only when `Array` is the global. |
| `runIt(f)` | `runIt(f)` with an import | Only when `runIt` is not a local binding. |
| `import "@marthvon/protopp"` | removed | Kept with `legacy: true`. |

Left untouched, so safe to write: `x.countItBy = …`, `delete x.countItBy`, `new x.countItBy()`, method definitions such as `class A { countItBy() {} }`, and `super.countItBy()`.

**Safe dispatch** decides at runtime:

1. The receiver's own method wins: class methods, Array subclasses, object literals.
2. Otherwise protopp's body runs when the receiver has the target type. Array methods need `Array.isArray`, String and Number methods accept primitives and boxed values, Function methods need a function, Error methods need `instanceof Error`, and Object methods accept any non-null value.
3. Otherwise any method the receiver has is called.
4. Otherwise a `TypeError` such as `receiver.countItBy is not a function` is thrown.

**Development-only checks.** Many Object methods throw in development when the receiver is not a plain object or array, for example `copyOnly can only be called by Object`. Production builds remove those checks, and the method then runs on whatever it receives. Treat those errors as bugs to fix, never as control flow.

**Prototype safety.** protopp's own writes never change an object's prototype or write into a prototype object: `__proto__` keys become own properties, and `deepSet` refuses inherited path segments. Writes still go through setters and proxy `set` traps, so Vue and Svelte reactivity keep working.

## 5. Method reference

"Copy" means the method returns a new value. "In place" means it mutates the receiver.

### Arrays

| Call | Result |
|---|---|
| `arr.combineUniquely(...arrays)` | Copy with the unique values of every array (`Set` identity). |
| `arr.countItBy()` | `{ [value]: count }`. Keys become strings. |
| `arr.countItByP()` | `Map<value, count>`, keeping key types and object identity. |
| `arr.groupItBy(fn)` | `{ [fn(value)]: values[] }`. |
| `arr.groupItByP(fn)` | `Map<fn(value), values[]>`. |
| `arr.paginateIt(size)` | Pages of `size`. `size` must be an integer of 1 or more. |
| `arr.evenlySplit(parts, remainderAtEnd = true)` | `parts` equal pages plus one page for the remainder, last or first: `[1,2,3,4,5].evenlySplit(2)` → `[[1,2],[3,4],[5]]`. |
| `arr.legacyFlat(depth = 1)` | `flat`. A negative depth flattens fully. |
| `arr.removeIndex(...indexes)` | Copy without those positions. |
| `arr.removeValue(valueOrPredicate, times = -1)` | Copy without matches. `times` caps removals. A value with its own `isEquals` method compares with it. |
| `arr.searchSorted(number)` | On an ascending array of numbers: the index of the value, else `-(insertion index) - 1`. `Array.closestIndex(result)` turns that into the insertion index. |
| `arr.searchSorted(compare)` | Same, with `compare(element)` below 0 when the element sorts before the target. |
| `arr.sortedInsert(number)` | In place; keeps the array ascending. |
| `Array.justZip(...arrays)` | Tuples up to the longest array; missing slots are `undefined`. |
| `Array.zipIt(n, ...arrays)` | The first `n` tuples. |
| `Array.zipIt(state => boolean, ...arrays)` | Tuples while the predicate holds. `state` has `index`, `endCount`, and `endTruths` (bit flags of finished arrays, first array in the highest bit). |
| `Array.zipItr(...arrays)` | A handler with `forEach({ d0, cond })`, `map({ d0, cond })`, and `reduce({ d0, cond }, initial)`. It can be used once. |

### Strings

| Call | Result |
|---|---|
| `str.sanitizeRegex()` | Escapes regular-expression syntax. |
| `str.sanitizeHtml()` | Encodes HTML entities (uses `he`). |
| `str.trimIt(text)` | Removes repeated `text` from both ends: `"--a--".trimIt("-")` → `"a"`. |
| `str.charAdd(n, index = 0)` | The character at `index`, shifted by `n` code units. |
| `str.indexOfOccurIn(search, nth)` | Index of the `nth` occurrence, or `-1`. |
| `str.indexOfAll(search)` | Every index of the literal `search`. |
| `str.titleToSlug()`, `str.titleToSnakeCase()` | `"Hello World"` → `"hello-world"`, `"hello_world"`. |
| `str.slugToTitleCase()`, `str.snakeToTitleCase()` | `"my_snake_case"` → `"My Snake Case"`. |
| `str.compareIt(other, flags)` | `-1`, `0`, or `1`. Flags: `i` ignores case, `l` puts longer strings first, and one of `a m o f t d` orders letters, numbers, and symbols. The default is `a` (letters, then numbers, then symbols). |
| `str.isCharAlpha(at = 0)`, `isCharNumber`, `isCharSymbol`, `isCharAscii` | ASCII class of one character. |

### Numbers

| Call | Result |
|---|---|
| `n.isEquals(m, epsilon = 1e-6)`, `greaterThan`, `lessThan`, `atLeast`, `atMost` | Float-tolerant comparisons; `false` when `m` is not a number. |
| `n.approximate(significance = 3)` | Drops float noise: `(0.1 + 0.2).approximate()` → `0.3`, `(5.9999).approximate()` → `6`. `significance` is an integer from 0 to 15. |
| `Math.floorP(n)`, `Math.fractP(n)` | Floor and fraction computed from the printed decimal: `Math.floorP(-2.5)` → `-3`. |
| `Math.fract(n)` | `n - Math.floor(n)`. |

### Functions

Each wrapper returns a new function and keeps async-ness: wrapping an `async` function returns an `async` function.

| Call | Result |
|---|---|
| `fn.debounce(ms)` | The first call runs immediately. Calls inside the window are delayed so runs stay `ms` apart, and return a promise of the result. |
| `fn.throttle(ms)` | Calls inside the window are skipped and return `undefined`. A call that ran and returned `undefined` returns `VoidRan` (`{ returns: undefined }`). |
| `fn.overridable(queueSize, ms)` | Queues calls `ms` apart. When the queue is full, the oldest queued call rejects with `"call-overriden"`. |
| `fn.deferrable()` | Inside a `function` (not an arrow), `this.defer = () => cleanup()` registers cleanups that run after the call, even when it throws. Async calls run them after the promise settles. |
| `fn.memoize()` | Caches by `JSON.stringify(args)`. Async functions share one in-flight promise and forget rejections. |
| `fn.memoizeFifo(limit, onDealloc)`, `memoizeLru`, `memoizeLfu` | Bounded caches. `limit` is an integer above 1. `onDealloc(value, key)` runs on eviction. |
| `Function.isAsync(fn)` | `true` for `async` functions. |

### Objects

| Call | Result |
|---|---|
| `obj.copyOnly(...keys)` | Copy with only `keys`. |
| `obj.removeKey(...keys)` | In place; returns `obj`. |
| `obj.deepMerge(...sources)` | In place. Plain objects merge recursively; anything else is assigned by reference. |
| `obj.deepCopy()` | `structuredClone`, or a JSON round trip where it is missing. |
| `obj.deepCopyP()` | Copies plain objects and arrays, keeps class instances and functions by reference, calls a value's own `copyIt()` when present, and preserves cycles. |
| `obj.isEquals(other)` | `JSON.stringify` equality. |
| `obj.isEqualsP(other)` | Deep equality; numbers use the epsilon, and values with their own `isEquals` use it. |
| `obj.flatIt(depth = 1)` | Lifts nested plain-object keys: `{a:{b:{c:1}},d:2}.flatIt(-1)` → `{c:1,d:2}`. |
| `obj.flipIt()`, `obj.flipItP()` | Swaps keys and values, into an object or a `Map`. |
| `obj.appendInsert(key, ...values)` | In place; pushes into the array at `key`, creating it. |
| `obj.deepSet(path, value)` | In place. Every segment but the last must already be an own key. |
| `obj.deepSetP(path, value)` | In place; creates missing objects along `path`. |
| `obj.deepGet(...path)`, `obj.deepGetP(...path)` | The value at `path`. `deepGet` throws when the path breaks; `deepGetP` returns `undefined`. |
| `obj.mapIt(([k, v]) => [k2, v2])`, `obj.filterIt(([k, v]) => keep)` | Copy built from the entries. |
| `obj.mapItIn(([k, v]) => v2)` | In place; replaces values. |
| `obj.reduceIt((acc, [k, v]) => next, initial)` | Reduces the entries. |
| `obj.diffIt(other)` | `{ updated, inserted, deleted }` key arrays. |
| `obj.validateIt(rules, ...keys)` | `[invalid, validCopy]`. A rule returns a message when its value is invalid. With exactly one key, returns that rule's message. |
| `obj.castParseIt({ key: parse })` | In place; replaces each listed value with `parse(value)`. |
| `obj.detachIt(childKey, ...references)` | Removes `obj[childKey]` and copies the referenced parent fields onto each child: `parent.detachIt("children", { id: "parentId" })`. |
| `value.letz(fn)`, `value.lets(fn)`, `value.letx(test, fn)` | Kotlin-style `let`: `fn(value)`, with `undefined` results returned as `VoidRan`. `lets` skips falsy values; `letx` runs only when `test(value)` is true. |

### Errors and globals

| Call | Result |
|---|---|
| `err.suppressedThrow(other)` | Throws a `SuppressedError` holding `other` and `err`. |
| `err.safeCatch(fn)` | Runs `fn`; if it throws, throws a `SuppressedError` holding both errors. |
| `runIt(fn)` | `fn()`. |
| `truthTable(...booleans)` | Bit flags; the first argument is the highest bit: `truthTable(true, false, true)` → `5`. |
| `nullCoalesce(value, fallback)` | `value`, or `fallback` (called if it is a function) when `value` is `null` or `undefined`. |
| `lineNoHere()` | The caller's line number. |
| `isClass(value)`, `isCustomClass(value)` | Object built by a class other than `Object` and `Array`; `isCustomClass` also excludes built-in classes. |
| `matchOrdering(a, b)`, `matchOrderingP(a, b)` | `-1`, `0`, or `1`; the `P` version uses the float-tolerant comparisons. |

## 6. Classes

Import each class from `@marthvon/protopp/classpp/<Name>.js`. Every class is the default export; the managers are also named exports.

| Class | API |
|---|---|
| `Lru`, `Lfu`, `Fifo` | `new Lru(limit, onDealloc)`. `has`, `get`, `peek` (does not refresh recency or frequency), `set`, `delete`. `onDealloc(value, key)` runs on eviction only. |
| `BTree` | A sorted map built as a B+tree: `new BTree(compare = compareValues, order = 32)`. `set`, `get`, `has`, `delete`, `clear`, `size`, `at(index)` and `rank(key)` (both O(log n)), `first()`, `last()`, `view(options)`, and `entries`, `keys`, `values` taking the same options. The module also exports `compareValues` (a total order over mixed values) and the sentinels `MIN` and `MAX`. See section 6.1. |
| `Observable` | `.value` get and set; the setter accepts `previous => next`. `subscribe(fn)` returns an unsubscribe function. |
| `SyncResult` | A synchronous result: `SyncResult.resolve(value)`, `SyncResult.fail(error)`, `then`, `catch`, `unwrap(or)`, `expect(message)`, `throwOnFail()`, `isFail()`. |
| `SuppressedError` | Collects several errors: `errorStack`, `handleTop()`, `topRecovered()`, `suppressed(err)`, `isHandled()`, `throw()`, `forEach`, `map`. The message lists the errors, newest first. |
| `TimeoutManager` | `setTimeout(fn, ms, ...args)`, `clearTimeout(id)`, `delay(ms, signal)`, `flush()`, `awaitRemaining()`, `size`. `delay` rejects with an `AbortError` when flushed, cleared, or aborted. |
| `IntervalManager` | `setInterval(fn, ms, ...args)`, `clearInterval(id)`, `flush()`, `size`. |
| `FetchManager` | `getSignal()`, `abortion(reason)` (abort, then start a fresh signal), `create()` (a child manager), `propagateAbortion(reason)` (this manager and its children), `destroy(child)` (abort the child and forget it). |

Give each page or component instance its own managers, and flush or abort them on teardown (`onDestroy` in Svelte, the effect cleanup in React).

### 6.1 Iterating a BTree

`tree.view(options)` returns a view: an iterable of `[key, value]` entries that can be iterated again and again, and each iteration reads the tree as it is at that moment. All options are optional:

| Option | Meaning |
|---|---|
| `gt`, `gte`, `lt`, `lte` | Key bounds. With both `gt` and `gte` (or `lt` and `lte`), the tighter one applies. |
| `reverse` | Iterate from the highest key down. |
| `offset` | Skip this many entries first. Without a `mask`, the view jumps straight there in O(log n). |
| `limit` | Stop after this many entries. |
| `mask` | A `Set` of values to keep, or `(value, key) => boolean`. The offset and limit count only kept entries. |

A view has `keys()`, `values()`, `toArray()`, and `count()`. `count()` is O(log n) without a mask. Two ways to page:

```js
const page = tree.view({ offset: pageIndex * 20, limit: 20 });
const after = tree.view({ gt: lastKeyOnScreen, limit: 20 });
```

The first is page-number pagination, and suits virtual scrolling with `tree.at(index)` and `tree.rank(key)`. The second continues from a key and is unaffected by inserts before it.

Rendering a view:

| Framework | Code |
|---|---|
| React | `Array.from(view, ([key, row]) => <Row key={String(key)} row={row} />)` |
| Vue 3 | `<Row v-for="[key, row] in view" :key="String(key)" :row="row" />` |
| Svelte 5 | `{#each view as [key, row] (key)}<Row {row} />{/each}` |
| Solid | `<For each={view.toArray()}>{([key, row]) => <Row row={row} />}</For>` |

A view does not notify anyone when the tree changes. Re-render when you change the tree, for example by watching `tree.version`, which changes whenever a key is added or removed. Changing the tree while a view is being iterated throws `BTree changed while it was being iterated`; collect the entries first (`toArray()`), then change the tree.

## 7. fetchExtra: promise state instead of loading flags

```js
import { FetchExtra, fetchExtra, FetchError } from "@marthvon/protopp/modulepp/fetchExtra.js";
```

`new FetchExtra(options)` (or the shortcut `fetchExtra(options)`) creates a loader; `loader.fetch(call)` makes a request. Your state holds one of three things, and the UI reads it directly:

- `undefined`: not loaded. Calling `load` starts a request.
- a `Promise`: in flight. Every call returns that same promise.
- anything else: loaded. `load` returns it synchronously.

Use `null`, never `undefined`, for "loaded and empty".

### 7.1 Options

| Option | Default | Meaning |
|---|---|---|
| `fetchMethod` | `globalThis.fetch` | `(url, init, ...extraArgs) => response`. Any function works, for example an SDK call. |
| `defaultUrl` | none | Base URL when the call passes no `url`. |
| `getter(request)` | none | Reads your state. |
| `setter(value, request, source)` | none | Writes your state. `source` is `"pending"` (value is the promise), `"cache"`, or `"fetch"`. |
| `cacher` | none | Either a function `(request) => value` that reads a local cache (sync or async; return `undefined` on a miss), or a store with `get(key)` and `set(key, value)`, such as a `StorageExtra` (section 10.4). A store is read before fetching and written after each successful fetch, for `GET` and `HEAD` requests only. |
| `cleanFetcher(response, request)` | none | Turns a response into the value, for example `(response) => response.json()`. May be async. |
| `cleanCacher(cached, request)` | none | Turns a cached entry into the value. May be async. |
| `retry` | `0` | Extra attempts after the first. |
| `retryDelay` | `0` | Milliseconds, or `(tries, error) => ms`. |
| `errorCallback` | none | `(error, tries, isFetcher)` for every failed attempt (`isFetcher` is `false` for cache errors), or a string prefix that logs with `console.error`. |
| `timeoutManager` | a private one | Retry waits go through it, so `flush()` cancels them. |
| `fetchManager` | none | Its signal aborts every request started while it is current. |
| `waitFor(request)` | none | Awaited before fetching; afterwards `getter` is read again (section 7.6). |
| `dedupe` | `true` | Share in-flight requests that have the same key. |

### 7.2 The call

```js
loader.fetch({ url, slug, method, config, force }, ...extraArgs);
```

| Field | Meaning |
|---|---|
| `url` | Overrides `defaultUrl`. |
| `slug` | A path segment, or an array of segments, appended with `/`. Each segment is URI-encoded: `{ slug: ["a b", "../x"] }` → `/a%20b/..%2Fx`. |
| `method` | HTTP method, upper-cased. Falls back to `config.method`, then `GET`. |
| `config` | Spread into the `init` passed to `fetchMethod`. Do not pass `config.signal`: the signal always comes from `fetchManager`, and development builds throw. To cancel a single call, give it its own child manager from `fetchManager.create()`. |
| `force` | Skips `getter` and `cacher`, but still joins an identical request in flight. |
| `extraArgs` | Passed to `fetchMethod` after `init`. |

`getter`, `setter`, `cacher`, and `waitFor` receive a request object: `{ url, slug, method, config, key, dedupable }`. `url` is the final URL, and `key` is `"METHOD url"` plus the body when the body is a string. Requests whose body is not a string (`FormData`, `Blob`, …) are never deduplicated.

`loader.pending()` returns a promise that settles when every request currently in flight has settled, or `undefined` when none is.

### 7.3 What happens on each call

1. `getter(request)` returns something other than `undefined` (and not a promise that already failed): that is returned.
2. An identical request is in flight: its promise is returned.
3. `cacher(request)` hits: the value goes through `cleanCacher`, then `setter(value, request, "cache")`. A synchronous hit is returned synchronously. A miss or a cache error (reported with `isFetcher: false`) falls through.
4. `setter(promise, request, "pending")`.
5. `waitFor(request)` is awaited if set. If `getter(request)` now returns a value that is not a promise, the call resolves to it without fetching.
6. `fetchMethod(url, { ...config, method, signal }, ...extraArgs)`. A response with `ok === false` throws `FetchError` (`error.status`, `error.response`). Then `cleanFetcher`, then `setter(value, request, "fetch")`.
7. On error: an `AbortError` rejects immediately. Otherwise `errorCallback(error, tries, true)` runs and the request is retried up to `retry` times when the error is a network error, an error without an HTTP status, or HTTP 408, 429, or 5xx. Other 4xx responses are not retried.
8. A rejected promise stays in your state, so `{:catch}` or an error boundary can show it. The next call starts a new request.

### 7.4 Svelte: a page without loading flags

```svelte
<script>
   import { onDestroy } from "svelte";
   import { fetchExtra } from "@marthvon/protopp/modulepp/fetchExtra.js";
   import FetchManager from "@marthvon/protopp/classpp/FetchManager.js";
   import TimeoutManager from "@marthvon/protopp/classpp/TimeoutManager.js";

   export let slug;

   const fetches = new FetchManager();
   const timers = new TimeoutManager();
   let post;

   const loadPost = fetchExtra({
      defaultUrl: "/api/posts",
      setter: (value, request) => {
         if (request.slug === slug) post = value;
      },
      cleanFetcher: (response) => response.json(),
      retry: 2,
      retryDelay: (tries) => tries * 500,
      fetchManager: fetches,
      timeoutManager: timers,
   });

   $: loadPost.fetch({ slug, force: true });

   onDestroy(() => {
      fetches.propagateAbortion();
      timers.flush();
   });
</script>

{#await post}
   <p>Loading…</p>
{:then value}
   <h1>{value.title}</h1>
{:catch error}
   <p role="alert">{error.message}</p>
{/await}
```

When one variable holds the state for a changing input, check the request in the setter, as above. Otherwise a slow earlier response can overwrite a newer one.

### 7.5 React

```jsx
import { useEffect, useState } from "react";
import { fetchExtra } from "@marthvon/protopp/modulepp/fetchExtra.js";
import FetchManager from "@marthvon/protopp/classpp/FetchManager.js";

export function usePost(slug) {
   const [post, setPost] = useState();
   const [error, setError] = useState();
   useEffect(() => {
      const fetches = new FetchManager();
      const load = fetchExtra({
         defaultUrl: "/api/posts",
         setter: (value, request, source) => {
            if (source !== "pending") setPost(value);
         },
         cleanFetcher: (response) => response.json(),
         fetchManager: fetches,
      });
      setPost(undefined);
      setError(undefined);
      Promise.resolve(load.fetch({ slug })).catch((reason) => {
         if (reason?.name !== "AbortError") setError(reason);
      });
      return () => fetches.propagateAbortion();
   }, [slug]);
   return { post, error };
}
```

Skip the `"pending"` source in React; passing a promise to `setState` stores it. Pass a promise only when a component consumes it with `use()` under `<Suspense>`.

### 7.6 Waiting for a list before loading one item

A detail request can wait for a list request in flight and reuse its rows instead of fetching again:

```js
const loadPost = fetchExtra({
   defaultUrl: "/api/posts",
   getter: ({ slug }) => posts.get(slug, "slug"),
   setter: (value, request, source) => {
      if (source === "fetch") posts.upsert(value);
   },
   cleanFetcher: (response) => response.json(),
   waitFor: () => loadPosts.pending(),
});
```

The getter must read a store that the list fills (here an `indexExtra` table, section 8), and the setter must ignore the `"pending"` promise so it never overwrites that store.

### 7.7 Rules

- Deduplication is per instance. Export one instance from a module to share in-flight requests across components.
- On a server, module state is shared by every request. Create `fetchExtra` instances, and the state they write, inside the request or component that owns them, never in a module shared across users.
- An abort belongs to whoever started the request; callers that joined it share its result, including the abort.
- `FetchError` is thrown only for objects with a numeric `status` and `ok === false`. A custom `fetchMethod` that returns plain data skips that check.

## 8. indexExtra: an indexed in-memory table

```js
import { indexExtra, expireAfter } from "@marthvon/protopp/modulepp/indexExtra.js";
```

`indexExtra` keeps a local copy of fetched rows and answers lookups, filters, range queries, ordering, and pages without another request. It also records when each row was fetched, so plugins can invalidate old rows, and it can save itself encrypted (section 9).

### 8.1 Schema

```js
const posts = indexExtra({
   id: "primary",
   slug: "unique",
   authorId: "indexed",
   publishedAt: "indexedOrdered",
   rank: "uniquelyOrdered",
   authorDate: { kind: "indexedOrdered", fields: ["authorId", "publishedAt"] },
   email: { kind: "unique", key: (row) => row.email?.toLowerCase(), onConflict: "replace" },
   title: undefined,
}, {
   now: Date.now,
   onDealloc: (row) => {},
   plugins: [expireAfter(5 * 60 * 1000)],
});
```

| Kind | Structure | `get(key, name)` returns | Range, prefix, and ordered streaming |
|---|---|---|---|
| `primary` (exactly one) | hash map | one row | no |
| `unique` | hash map | one row | no |
| `indexed` | hash map of `Set`s | an array | no |
| `uniquelyOrdered` | hash map and B+tree | one row | yes |
| `indexedOrdered` | B+tree | an array | yes |

- The schema key is the index name and, by default, the field read from each row.
- `fields: [...]` builds a composite key (an array compared element by element).
- `key: (row) => value` computes the key.
- `compare: (a, b) => number` changes the order of an ordered index. Prefix queries need the default order.
- Unique indexes ignore `null` and `undefined` keys, so rows without a value never conflict. A second row that claims a taken unique key throws `indexExtra slug "a" already belongs to id 1`, unless the index has `onConflict: "replace"`, which removes the old row.
- Keys may be strings, numbers, booleans, bigints, `Date`s (compared by time), or arrays of those.
- A schema entry set to `undefined` or `null` documents a plain field. Every field can be filtered and sorted; indexes make it fast.

### 8.2 Writing rows

| Call | Effect |
|---|---|
| `table.upsert(...rows)` | Inserts, or replaces by primary key. Stamps each row with `now()`. Returns the table. |
| `table.patch(key, changes)` | Replaces the row with `{ ...row, ...changes }`, re-indexes it, and keeps its fetch time. Cannot change the primary key. Returns the new row, or `undefined`. |
| `table.delete(...keys)` | Removes rows by primary key; returns how many. |
| `table.clear()` | Removes every row; returns how many. |

Rows are stored by reference. Never mutate an indexed field of a stored row in place; the indexes would go stale. Use `upsert` or `patch`. Mutating unindexed fields is safe.

### 8.3 Reading rows

| Call | Result |
|---|---|
| `table.get(key)` | Row by primary key, or `undefined`. |
| `table.get(key, name)` | Through index `name`: one row for `primary`, `unique`, and `uniquelyOrdered`; an array (possibly empty) for `indexed` and `indexedOrdered`. Composite keys are arrays: `get([7, date], "authorDate")`. |
| `table.has(key)` | Whether the primary key is present. |
| `table.query(query)` | An array of rows (section 8.4). |
| `table.count(query)` | Number of matching rows; ignores `offset` and `limit`. |
| `table.rows()`, `[...table]` | Every row, in insertion order. |
| `table.size` | Number of stored rows. |
| `table.fetchedAt(key)` | When the row was last written by `upsert` or `restore`. |

### 8.4 Queries

```js
posts.query({
   where: {
      authorId: { in: [7, 9] },
      publishedAt: { gte: start, lt: end },
      slug: { prefix: "2026-" },
      draft: false,
   },
   filter: (row) => row.tags.includes("svelte"),
   orderBy: ["-publishedAt", "title"],
   offset: 20,
   limit: 20,
});
```

- `where` maps an index name or a field name to a value (equality) or to operators: `eq`, `in` (array), `gt`, `gte`, `lt`, `lte`, `prefix` (a string, or an array for a composite key). A condition set to `undefined` is ignored, so optional filters can be passed through directly. `null` matches only `null`.
- `filter(row)` runs after `where`, on the remaining candidates.
- `orderBy` is a name, `-name` for descending, an array of those, or `(a, b) => number`. Ties are broken by primary key, in the direction of the first term. Without `orderBy`, rows come back in insertion order.
- `offset` and `limit` are applied after ordering.

How a query runs:

1. Every `where` condition backed by an index produces candidates. Equality and `in` on any index cost about one lookup per value. Ranges and prefixes scan an ordered index.
2. The smallest candidate set drives the query. The other conditions are checked on each candidate; a condition its index already enforces exactly is not checked again.
3. When the first `orderBy` term has an ordered index, rows stream from that index in order, with the candidate set as a mask:
   - With one term, the scan stops after `offset + limit` matches. With no other conditions, no `filter`, and no `stale` plugin, it jumps straight to `offset` in O(log n).
   - With more terms, only rows that tie on the first term are sorted by the rest, one tie run at a time. The scan stops after the run that fills `limit`.
4. Otherwise the candidates are collected and sorted. With no usable index, every row is scanned.

`count(query)` answers in O(log n) or O(1) for a query with at most one condition that its index enforces exactly, and no `filter` or `stale` plugin.

For fast queries:

- Index the fields you put in `where` and `orderBy`, and give the most selective condition an index.
- Give the first `orderBy` term an ordered index.
- If a several-key sort is frequent and its first key has few distinct values (such as a status), long tie runs get sorted. Add a composite ordered index over those fields and order by its name instead, for example `{ kind: "indexedOrdered", fields: ["status", "publishedAt"] }`. Its rows are already in final order.

### 8.5 Freshness, invalidation, and plugins

```js
posts.invalidate({ olderThan: 10 * 60 * 1000 });
posts.invalidate({ before: lastLogin });
posts.invalidate((row, fetchedAt) => row.authorId === bannedId);
```

`invalidate` removes the matching rows and returns them.

A plugin is an object with any of these hooks. `table.use(plugin)` returns a function that removes the plugin.

| Hook | Receives | Called |
|---|---|---|
| `upsert` | `{ row, previous, fetchedAt, source, table }` (`source` is `"upsert"`, `"patch"`, or `"restore"`) | after a row is written |
| `delete` | `{ row, fetchedAt, reason, table }` (`reason` is `"delete"`, `"invalidate"`, `"stale"`, `"conflict"`, or `"clear"`) | after a row is removed |
| `stale` | `{ row, fetchedAt, age, table }` | on reads; returning `true` hides the row and removes it once the read finishes |

`expireAfter(ms)` is a ready-made `stale` plugin that expires rows older than `ms`. Pass a `now` option to the table to control the clock in tests. Do not modify the table from inside `filter` or a `stale` hook.

### 8.6 Snapshots

| Call | Result |
|---|---|
| `table.snapshot()` | `{ v: 1, rows: [[fetchedAt, row], ...] }`, plain JSON-safe data. |
| `table.restore(snapshot, { revive })` | Loads rows with their fetch times and returns how many it wrote. A row the table already holds with an equal or newer fetch time is kept. `revive(row)` converts JSON back, for example strings into `Date`s. |
| `await table.encode(options)` | `seal(table.snapshot(), options)`: a string to store. |
| `await table.decode(sealed, options)` | `unseal` followed by `restore`; returns how many rows it restored. |

Rows must survive JSON when they are encoded. Convert other values with `revive`.

## 9. sealExtra: encrypted persistence

```js
import { seal, unseal, sealDataKey, unsealDataKey, generateKeyPair, toBase64, fromBase64 } from "@marthvon/protopp/modulepp/sealExtra.js";
```

`seal(value, { publicKeys, aad })` JSON-encodes `value` and encrypts it with a fresh AES-256-GCM key. That key is split into one XOR share per public key, and each share is wrapped separately. **Opening the value needs every matching private key, in the same order.** `aad` is extra authenticated data; use it to bind a blob to a user and a purpose, such as `"user:42:posts"`.

A public key can be:

- a `CryptoKey` or a public JWK, which wraps its share in the browser with RSA-OAEP (SHA-256), or
- a wrap function `(share: Uint8Array) => wrappedShare` that sends the share to your server and returns what the server answers, as a `Uint8Array`, an `ArrayBuffer`, or base64. The server wraps the share with a key that never leaves it.

`unseal(sealed, { privateKeys, aad })` opens it. A private key can be:

- a `CryptoKey` or a private JWK, or
- an unwrap function `(wrappedShare: Uint8Array) => share` that sends the wrapped share to your server and returns the 32-byte share.

Shares are wrapped and opened in order, so put a device key before a server function; a failing device key then stops before any request.

Encryption is enforced unless you opt out on both sides. `seal` without `publicKeys` throws. A plaintext blob needs `seal(value, { plaintext: true })` to write and `unseal(text, { plaintext: true })` to read; otherwise `unseal` refuses it, so an attacker cannot swap in unencrypted data. Tampering, a wrong key, or a different `aad` throws `sealExtra could not open the sealed value`. In that case, discard the blob and fetch the data again.

`generateKeyPair({ modulusLength = 3072, extractable = true })` returns an RSA-OAEP `CryptoKeyPair`. `extractable: false` keeps the private key from being exported; the public key can always be exported.

**Who can write data that opens.** A share wrapped in the browser with a public key can be wrapped by anyone who has that public key, so with browser-side wrapping alone, someone who can write to the storage can plant a value that opens. A share wrapped by your server's wrap function can only come from the server. With at least one server-wrapped share, a value that opens was sealed through your server, so reading the data and planting data both need a signed-in session (sections 9.1 and 9.2). Either way, treat opened data as a cache of what the server sent, never as a source of permissions.

### 9.1 Setup A: the server holds the key pair

Both halves of the user's key pair stay on the server, and the browser only calls two authenticated endpoints. Without a signed-in session, data in the browser can be neither read nor planted. Deleting the user's key pair makes every cached copy unreadable, which works as a remote wipe.

Create one key pair **per user** on the server and store both halves with the user's record. Never send either half to the browser.

```js
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
   modulusLength: 3072,
   publicKeyEncoding: { type: "spki", format: "pem" },
   privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
```

The wrap endpoint, `src/routes/api/cache-key/wrap/+server.js` in SvelteKit (any Node server works the same way). `keysFor` stands for your own lookup of the user's stored keys.

```js
import { constants, publicEncrypt } from "node:crypto";

export async function POST({ request, locals }) {
   if (!locals.user) return new Response(null, { status: 401 });
   const share = Buffer.from(await request.text(), "base64");
   const { publicKey } = await keysFor(locals.user.id);
   const wrapped = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, share);
   return new Response(wrapped.toString("base64"));
}
```

The unwrap endpoint, `src/routes/api/cache-key/unwrap/+server.js`:

```js
import { constants, privateDecrypt } from "node:crypto";

export async function POST({ request, locals }) {
   if (!locals.user) return new Response(null, { status: 401 });
   const wrapped = Buffer.from(await request.text(), "base64");
   const { privateKey } = await keysFor(locals.user.id);
   const share = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, wrapped);
   return new Response(share.toString("base64"));
}
```

In the browser:

```js
import { seal, unseal, toBase64 } from "@marthvon/protopp/modulepp/sealExtra.js";

const callServer = (path) => async (bytes) => {
   const response = await fetch(path, { method: "POST", body: toBase64(bytes) });
   if (!response.ok) throw new Error(`${path} answered ${response.status}`);
   return response.text();
};
export const wrapOnServer = callServer("/api/cache-key/wrap");
export const unwrapOnServer = callServer("/api/cache-key/unwrap");

const sealed = await seal(value, { publicKeys: [wrapOnServer], aad: `user:${userId}` });
const opened = await unseal(sealed, { privateKeys: [unwrapOnServer], aad: `user:${userId}` });
```

Use one key pair per user, not one shared pair; with a shared pair, any signed-in user could open data that another account left on the same device. The server may wrap with a symmetric key instead, such as AES-GCM; the browser cannot tell the difference. Sending the user's public key to the browser (`publicKeys: [userPublicJwk]`) also works and saves the wrap request, but then anyone who has that public key can plant data that opens.

### 9.2 Setup B: a device key pair and a server key pair (two of two)

Add a key pair that lives in the browser in front of the server functions. The device's key pair stays on the device, and the user's key pair stays on the server. Each wraps one share of the key that protects the data, so reading or planting data needs the device and a signed-in session, and the server alone cannot read the data either, because it never sees the device's share.

```js
const device = await generateKeyPair({ extractable: false });
const keys = {
   publicKeys: [device.publicKey, wrapOnServer],
   privateKeys: [device.privateKey, unwrapOnServer],
   aad: `user:${userId}`,
};

const sealed = await seal(value, keys);
const opened = await unseal(sealed, keys);
```

Store the device `CryptoKeyPair` in IndexedDB, and create it again only when none is stored. Structured clone keeps a non-extractable private key usable but not exportable, so a script running on the page can use it but cannot copy it out. Never put a private key in `localStorage` or in a cookie readable by JavaScript. A private key in an `HttpOnly` cookie cannot be used by the browser at all; the server would have to unwrap both shares, and the device would no longer be a separate factor.

### 9.3 Data keys: many values, one unwrap

Each `seal` with `publicKeys` needs the private keys again to open, which can mean one server call per value. For many values, seal one data key instead and encrypt the values with it:

| Call | Result |
|---|---|
| `sealDataKey({ publicKeys, aad })` | `{ key, sealed }`: a new AES-256 key as a non-extractable `CryptoKey`, and its sealed form to store. |
| `unsealDataKey(sealed, { privateKeys, aad })` | The `CryptoKey` again; needs the private keys once. |
| `seal(value, { dataKey, aad })`, `unseal(text, { dataKey, aad })` | AES-256-GCM with that key; no RSA, no server call. |

`storageExtra` uses these for its encrypted mode (section 10.3). Use them directly only for storage of your own.

## 10. storageExtra: persistent client storage

```js
import { StorageExtra, storageExtra } from "@marthvon/protopp/modulepp/storageExtra.js";
```

`StorageExtra` keeps JSON values in the browser under string keys. It is the persistence piece of the modules: a `FetchExtra` can use it as its `cacher`, an `indexExtra` table can be mirrored into it, and with `encrypt` every value goes through `sealExtra` before it is written. `storageExtra(options)` is a shortcut for `new StorageExtra(options)`.

### 10.1 Options and backends

| Option | Default | Meaning |
|---|---|---|
| `backend` | `"cache"` | `"cache"`, `"local"`, `"session"`, `"memory"`, or your own backend (section 10.5). |
| `name` | `"protopp"` | The namespace: the cache name, or the key prefix in local and session storage. `keys()` and `clear()` touch only this namespace. |
| `ttl` | none | Default lifetime in milliseconds. An older entry reads as missing and is removed. |
| `encrypt` | none | `{ publicKeys, privateKeys, aad }`: encrypt every value (section 10.3). |
| `plaintext` | `false` | `true` stores without encryption. Exactly one of `encrypt` or `plaintext: true` is required. |
| `now` | `Date.now` | The clock, for tests. |

| Backend | Kept until | Room | Synchronous | Notes |
|---|---|---|---|---|
| `"cache"` (Cache Storage) | cleared, or evicted when the disk is full | large, shared with the origin's quota | no | https or localhost only; service workers can read it |
| `"local"` (`localStorage`) | cleared | about 5 MB per origin | yes, without encryption | shared by every tab |
| `"session"` (`sessionStorage`) | the tab closes | about 5 MB | yes, without encryption | one tab only |
| `"memory"` | the page unloads | memory | yes, without encryption | tests and server rendering |

The default is Cache Storage: it holds the most, never blocks the page, and an offline service worker can read it. Browsers may evict it under storage pressure; `navigator.storage.persist()` asks the browser to keep it.

The backend is opened on first use, so creating a `StorageExtra` on a server does not throw; using a browser backend there does.

### 10.2 Methods

| Call | Result |
|---|---|
| `storage.get(key)` | The value, or `undefined` when it is missing or expired. |
| `storage.set(key, value, { ttl })` | Stores a JSON-safe value. `undefined` is rejected; use `delete`. |
| `storage.delete(key)` | Removes one entry. |
| `storage.keys()` | The stored keys of this namespace. |
| `storage.clear()` | Removes every entry of this namespace, including the sealed data key. |
| `storage.mirror(table, key, options)` | Keeps an `indexExtra` table in the storage (section 10.4). |

`"local"`, `"session"`, and `"memory"` without encryption return results directly; everything else returns a promise. `await` every call unless you chose one of those three. Values go through JSON, so `Date`s come back as strings.

An entry that cannot be read (not JSON, not written by `StorageExtra`, or failing decryption) is removed, and that read throws or rejects once with the reason. The next read returns `undefined`.

### 10.3 Encryption

```js
const storage = new StorageExtra({
   name: `user-${userId}`,
   ttl: 10 * 60 * 1000,
   encrypt: {
      publicKeys: [device.publicKey, wrapOnServer],
      privateKeys: [device.privateKey, unwrapOnServer],
      aad: `user:${userId}`,
   },
});
```

`publicKeys`, `privateKeys`, and `aad` work as in section 9. The example is Setup B (section 9.2); for Setup A, drop the device keys.

1. On first use, the storage creates a random AES-256 data key, seals it with `publicKeys` (one call to your wrap endpoint), and stores the sealed key next to the entries.
2. Every value is encrypted with the data key. The namespace and the entry's key are authenticated, so an entry copied under another key does not open.
3. After a reload, the first read unseals the data key once (one call to your unwrap endpoint) and keeps it in memory as a non-extractable `CryptoKey`. Every later read and write is local.

Rules:

- Give each signed-in user their own `name`, and call `storage.clear()` on sign-out. A data key sealed for one user does not open for another.
- If the data key cannot be opened (offline, or the server key was revoked), reads and writes reject and nothing is deleted. Call `clear()` to start over with the current keys.
- Use one `StorageExtra` per `name`, exported from a module. Two instances that create a data key at the same moment make each other's entries unreadable, and those entries then read as missing.

### 10.4 With fetchExtra and indexExtra

As the cache of a `FetchExtra`:

```js
const loadPosts = new FetchExtra({
   defaultUrl: "/api/posts",
   cleanFetcher: (response) => response.json(),
   cacher: storage,
});
```

- Only `GET` and `HEAD` requests use it, keyed by `request.key`, such as `"GET /api/posts"`.
- Before fetching, a stored value resolves the call, and the setter receives `source: "cache"`.
- After a successful fetch, the cleaned value is stored. A failed write is reported to `errorCallback` with `isFetcher: false` and never fails the request.
- `force: true` skips the stored value but still stores the new one.
- The storage's `ttl` decides how long a stored response is used.

Mirroring an `indexExtra` table:

```js
const stop = await storage.mirror(posts, "posts", { delay: 1000 });
```

- It restores the stored snapshot into the table. Rows the table already holds with a newer fetch time are kept.
- It saves `table.snapshot()` `delay` milliseconds after the last upsert or delete.
- Options: `delay` (default 500), `ttl`, `revive` (as in `restore`), and `errorCallback` (default: `console.error`). A stored value that is not a snapshot is reported and removed.
- `stop()` stops saving. A change from the last `delay` milliseconds before `stop()` is not saved.

Plain values, such as preferences:

```js
const prefs = new StorageExtra({ backend: "local", plaintext: true });
prefs.set("theme", "dark");
const theme = prefs.get("theme");
```

### 10.5 Your own backend

Any object with these four methods works as `backend`. Each may return a value or a promise.

| Method | Does |
|---|---|
| `read(id)` | Returns the stored text, or `undefined`. |
| `write(id, text)` | Stores the text. |
| `remove(id)` | Deletes the text. |
| `ids()` | Lists every stored id. |

The ids are `StorageExtra`'s internal names, and the texts are JSON strings. For example, IndexedDB through the `idb-keyval` package:

```js
import { createStore, del, get, keys, set } from "idb-keyval";

const store = createStore("protopp", "entries");
const backend = {
   read: (id) => get(id, store),
   write: (id, text) => set(id, text, store),
   remove: (id) => del(id, store),
   ids: () => keys(store),
};
```

## 11. Recipes

### 11.1 A shared post store for a single-page app

Keep this module browser-only (section 7.7).

```js
import { fetchExtra } from "@marthvon/protopp/modulepp/fetchExtra.js";
import { indexExtra, expireAfter } from "@marthvon/protopp/modulepp/indexExtra.js";

const FRESH = 5 * 60 * 1000;

export const posts = indexExtra({
   id: "primary",
   slug: "unique",
   authorId: "indexed",
   publishedAt: "indexedOrdered",
}, { plugins: [expireAfter(FRESH)] });

let listedAt = -Infinity;

export const loadPosts = fetchExtra({
   defaultUrl: "/api/posts",
   getter: () => (Date.now() - listedAt < FRESH ? true : undefined),
   setter: (value, request, source) => {
      if (source === "fetch") {
         posts.upsert(...value);
         listedAt = Date.now();
      }
   },
   cleanFetcher: (response) => response.json(),
});

export const loadPost = fetchExtra({
   defaultUrl: "/api/posts",
   getter: ({ slug }) => posts.get(slug, "slug"),
   setter: (value, request, source) => {
      if (source === "fetch") posts.upsert(value);
   },
   cleanFetcher: (response) => response.json(),
   waitFor: () => loadPosts.pending(),
});

export async function latestBy(authorId, page = 0) {
   await loadPosts.fetch();
   return posts.query({ where: { authorId }, orderBy: "-publishedAt", offset: page * 20, limit: 20 });
}
```

The list's freshness window matches `expireAfter`, so once the rows expire, the next `loadPosts.fetch()` fetches them again. To refresh sooner, call `loadPosts.fetch({ force: true })`. Concurrent calls share one request, so the getter only has to answer whether the list is fresh.

### 11.2 Keep the store encrypted across reloads

`wrapOnServer` and `unwrapOnServer` are the functions from section 9.1, and `device` is the stored device key pair from section 9.2.

```js
import { StorageExtra } from "@marthvon/protopp/modulepp/storageExtra.js";

export const storage = new StorageExtra({
   name: `user-${userId}`,
   encrypt: {
      publicKeys: [device.publicKey, wrapOnServer],
      privateKeys: [device.privateKey, unwrapOnServer],
      aad: `user:${userId}`,
   },
});

const stopMirror = await storage.mirror(posts, "posts", { delay: 1000 });
```

To cache single requests too, pass `cacher: storage` to `loadPost` in recipe 11.1. On sign-out: `stopMirror()`, then `posts.clear()`, then `await storage.clear()`.

## 12. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `@marthvon/protopp: production is still loading the prototype installer…` | A production bundle was built without the plugin. | Add the plugin to that bundler (section 3.2). |
| `… protopp cannot compile countItBy because it is not called …` | A method was read as a value. | Wrap it: `(...args) => arr.countItBy(...args)`. |
| `TypeError: receiver.countItBy is not a function` | The receiver has the wrong type, or is `null` or `undefined`. | Fix the value; use `?.` when it may be missing. |
| `x.countItBy is not a function` in development | No plugin, and the installer had not run in that runtime yet. | Add the plugin, or move `import "@marthvon/protopp"` to the earliest module (section 3.4). |
| `Property 'countItBy' does not exist on type …` | TypeScript has not loaded the global types. | Section 3.3. |
| `copyOnly can only be called by Object` and similar | A development check rejected the receiver. | Pass a plain object or array. |
| `deepSet cannot follow an inherited or missing key` | A path segment does not exist. | Create the path first, or use `deepSetP`. |
| `indexExtra slug "a" already belongs to id 1` | A unique key is already taken. | Fix the data, or use `onConflict: "replace"` if the newer row should win. |
| `indexExtra row is missing its primary key id` | A row has no primary key value. | Check `cleanFetcher`, or the schema's primary field name. |
| `fetchExtra needs a url or a defaultUrl` | Neither was given. | Pass one. |
| `FetchError: 404 Not Found` | The server answered with a non-2xx status. | Handle it in `{:catch}`, `.catch`, or `errorCallback`; 4xx responses other than 408 and 429 are not retried. |
| A rejection with `name === "AbortError"` | A manager or signal aborted the request, or `timeoutManager.flush()` cancelled a retry wait. | Usually expected after leaving a page; ignore it. |
| `sealExtra refused a plaintext value` | The stored blob is not encrypted but the caller expects encryption. | Treat it as tampering and discard it. |
| `sealExtra could not open the sealed value…` | Wrong keys, wrong `aad`, or changed data. | Discard the blob and fetch again. |
| `sealExtra needs WebCrypto…` | The page is not https or localhost, or Node is older than 19. | Serve over https; upgrade Node. |
| `storageExtra "cache" needs the Cache Storage API…` | The page is not https or localhost, or the code runs on the server. | Serve over https, use `backend: "local"`, or create the storage only in the browser. |
| `storageExtra needs encrypt: { publicKeys, privateKeys } or plaintext: true` | Neither was chosen. | Encrypt anything user-specific; use `plaintext: true` only for data that is safe to read. |
| `storageExtra entry … it was removed` | A stored entry could not be read: changed, written by other code, or encrypted with another data key. | Nothing; the next read is a miss and the data is fetched again. |

## 13. Working inside the protopp repository

These rules apply when you change protopp itself.

- `npm test` builds (`scripts/build.js`) and then runs every `tests/**/*.test.js` with `node:test`.
- `src/` holds the source in installer form: one `Object.defineProperty(Target.prototype, 'name', { value: function … })` per method, guarded by `if(!Target.prototype.name)`. `scripts/generate.js` reads those installs and generates `min/_impl` (bodies), `min/runtime` (dispatch helpers), the installers, `manifest.json`, and `types/runtime`.
- A new method must be imported by its folder's `index.js`, and its name must appear in `types/global.d.ts`. The build fails otherwise. Add tests that call it both through the prototype and through `min/runtime`.
- A file without method installs (classes in `classpp`, modules in `modulepp`, helpers) is a plain module. It is built once in `min/<path>` and re-exported from `min/_impl/<path>`, so every class has one identity. Never call `Object.defineProperty` directly in such a file: the generator would read it as a method install. Alias it, as `src/utilitypp/def/ownSet.js` does.
- The build compiles protopp calls inside plain modules too. Do not use a protopp method name as a member call in a plain module unless you mean protopp's method.
- `/* DEV START */` and `/* DEV END */` may wrap only `if (…) throw …` checks, one or several. The build fails if minification moves other code into a region.
- Write through `ownSet` from `src/utilitypp/def/ownSet.js` when a key can come from data, so `__proto__` never changes an object's prototype.
- Do not write code comments. The exception is logic that a competent developer would otherwise misread.
