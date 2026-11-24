# Prototype plus plus 
*(ppp.js, an extra p for the girthiest npm package that exists)*

* Utility package that extends the functionality of JS native types.
* Write maintainable and readable code within fewer lines than it would normally take.
* Ease of use in performing functionalities not native to JS at your convenience.
* Utilize language features you love from other language like Go, Rust or Kotlin.
* Code how you want with the freedom to choose the paradigm you like.

## How to get started?

``` bash 
npm install @marthvon/protopp 
```
``` javascript 
import '@marthvon/protopp'; 
```
 - will setup all additional prototype methods defined in global namespace

Import it once, at the top of the earliest module that actually runs on each runtime where you call a method. `@marthvon/protopp` declares `"sideEffects": true`, so a bundler keeps that import. Do not import it only inside a lazy-loaded or dynamically imported component. A chunk can call a method before that component's module has run.

SvelteKit has no single hooks file that runs on both the server and in the browser. `src/hooks.server.js` is server-only and `src/hooks.client.js` is browser-only. For pages, put the import at the top of `src/routes/+layout.js`, or in the script of `src/routes/+layout.svelte`. That module is evaluated for server rendering and again in the browser. A `+server.js` route or other server entry that never loads the layout also needs the import at the top of `src/hooks.server.js`.

Next.js does not run the root layout in the browser. A root `app/layout` file is a Server Component, so an import written only there never installs the methods on the client. `instrumentation-client.js` runs in the browser and does not run on the server. For pages, add a client module whose only job is `import '@marthvon/protopp'`, and render it from the root layout. Next evaluates that module on the server during SSR and again in the browser. Route handlers and the rest of the Node server do not load the layout, so also import it from `instrumentation.js` inside `register`. If you use `instrumentation-client.js` as the browser entry, pair it with `instrumentation.js`.

Optionally, only setup the method you require in the project like so: <br>
``` javascript 
import '@marthvon/protopp/objectpp/methods/copyOnly.js'; 
```
Now, you can call the prototype extension methods, like copyOnly method on an object like so: <br>
``` javascript 
{a:1,b:2,c:3}.copyOnly('a', 'c'); 
```

Learn more: https://marthvon-solution.tech/docs/protopp
Liscence Updated: 04/06/2024
