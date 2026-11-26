import assert from "node:assert/strict";
import test from "node:test";
import FetchManager from "../../min/classpp/FetchManager.js";
import TimeoutManager from "../../min/classpp/TimeoutManager.js";
import { FetchError, fetchExtra } from "../../min/modulepp/fetchExtra.js";
import { indexExtra } from "../../min/modulepp/indexExtra.js";

function response(body, status = 200) {
   return { ok: status >= 200 && status < 300, status, statusText: status === 200 ? "OK" : "Failed", json: async () => body };
}

function server(handler) {
   const calls = [];
   const fetchMethod = async (url, init, ...args) => {
      calls.push({ url, init, args });
      return handler(url, init, calls.length);
   };
   return { calls, fetchMethod };
}

function hang(url, init) {
   return new Promise((resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
}

test("state goes from undefined to the pending promise to the value", async () => {
   let state;
   const sources = [];
   const { calls, fetchMethod } = server(() => response({ id: 1 }));
   const load = fetchExtra({
      fetchMethod,
      defaultUrl: "/api/post",
      getter: () => state,
      setter: (value, request, source) => {
         state = value;
         sources.push(source);
      },
      cleanFetcher: (res) => res.json(),
   });
   const first = load.fetch();
   assert.ok(state instanceof Promise);
   assert.equal(load.fetch(), first);
   assert.deepEqual(await first, { id: 1 });
   assert.deepEqual(state, { id: 1 });
   assert.deepEqual(load.fetch(), { id: 1 });
   assert.deepEqual(sources, ["pending", "fetch"]);
   assert.equal(calls.length, 1);
   assert.equal(calls[0].url, "/api/post");
   assert.equal(calls[0].init.method, "GET");
});

test("identical requests in flight share one fetch, and bodies decide what is identical", async () => {
   const { calls, fetchMethod } = server((url) => response(url));
   const load = fetchExtra({ fetchMethod, defaultUrl: "/api/posts/", cleanFetcher: (res) => res.json() });
   const [a, b, c] = [load.fetch({ slug: 5 }), load.fetch({ slug: 5 }), load.fetch({ slug: ["a b", "../x"] })];
   assert.equal(a, b);
   assert.notEqual(a, c);
   assert.deepEqual(await Promise.all([a, c]), ["/api/posts/5", "/api/posts/a%20b/..%2Fx"]);
   assert.equal(calls.length, 2);
   const post = (body) => load.fetch({ method: "post", config: { body } });
   const [x, y, z] = [post("{\"n\":1}"), post("{\"n\":1}"), post("{\"n\":2}")];
   assert.equal(x, y);
   assert.notEqual(x, z);
   const form = { entries: [] };
   assert.notEqual(post(form), post(form));
   await Promise.all([x, z]);
   assert.equal(calls.filter((call) => call.init.method === "POST").length, 4);
   const separate = fetchExtra({ fetchMethod, defaultUrl: "/api/x", dedupe: false });
   assert.notEqual(separate.fetch(), separate.fetch());
   const late = load.fetch({ slug: 99 });
   assert.equal(load.pending() instanceof Promise, true);
   await load.pending();
   assert.equal(load.pending(), undefined);
   assert.equal(await late, "/api/posts/99");
});

test("server errors retry, client errors do not, and a failed state refetches", async () => {
   const reports = [];
   let failures = 1;
   const { calls, fetchMethod } = server((url) => {
      if (url.endsWith("/missing")) return response(null, 404);
      return failures-- > 0 ? response(null, 503) : response("ok");
   });
   let state;
   const load = fetchExtra({
      fetchMethod,
      defaultUrl: "/api",
      getter: () => state,
      setter: (value) => (state = value),
      cleanFetcher: (res) => res.json(),
      retry: 2,
      errorCallback: (error, tries, isFetcher) => reports.push([error.status, tries, isFetcher]),
   });
   assert.equal(await load.fetch(), "ok");
   assert.deepEqual(reports, [[503, 1, true]]);
   state = undefined;
   const missing = load.fetch({ slug: "missing" });
   await assert.rejects(missing, (error) => error instanceof FetchError && error.status === 404 && error.response.status === 404);
   assert.equal(state, missing);
   assert.deepEqual(reports.at(-1), [404, 1, true]);
   const again = load.fetch({ slug: "missing" });
   assert.notEqual(again, missing);
   await assert.rejects(again, FetchError);
   assert.equal(calls.length, 4);
});

test("network errors without a status are retried", async () => {
   let attempts = 0;
   const load = fetchExtra({
      fetchMethod: async () => {
         if (++attempts < 3) throw new TypeError("fetch failed");
         return "ok";
      },
      defaultUrl: "/flaky",
      retry: 2,
   });
   assert.equal(await load.fetch(), "ok");
   assert.equal(attempts, 3);
});

test("a sync cache answers without a promise, an async miss falls through, and force skips both", async () => {
   const reports = [];
   const { calls, fetchMethod } = server(() => response("network"));
   const cache = new Map([["GET /api/a", "cached"]]);
   const sync = fetchExtra({ fetchMethod, defaultUrl: "/api/a", cacher: (request) => cache.get(request.key), cleanCacher: (hit) => `${hit}!`, cleanFetcher: (res) => res.json() });
   assert.equal(sync.fetch(), "cached!");
   assert.equal(await sync.fetch({ force: true }), "network");
   const missing = fetchExtra({ fetchMethod, defaultUrl: "/api/b", cacher: async () => undefined, cleanFetcher: (res) => res.json() });
   assert.equal(await missing.fetch(), "network");
   const broken = fetchExtra({
      fetchMethod,
      defaultUrl: "/api/c",
      cacher: async () => { throw new Error("storage is full"); },
      errorCallback: (error, tries, isFetcher) => reports.push([error.message, tries, isFetcher]),
      cleanFetcher: (res) => res.json(),
   });
   assert.equal(await broken.fetch(), "network");
   assert.deepEqual(reports, [["storage is full", 0, false]]);
   const hit = fetchExtra({ fetchMethod, defaultUrl: "/api/d", cacher: async () => "from idb", setter: (value, request, source) => reports.push([value, source]) });
   assert.equal(await hit.fetch(), "from idb");
   assert.deepEqual(reports.at(-1), ["from idb", "cache"]);
   assert.equal(calls.length, 3);
});

test("the fetch manager aborts in-flight requests and the next call starts over", async () => {
   const manager = new FetchManager();
   const page = manager.create();
   const { calls, fetchMethod } = server(hang);
   let state;
   const load = fetchExtra({ fetchMethod, defaultUrl: "/slow", fetchManager: page, retry: 3, getter: () => state, setter: (value) => (state = value) });
   const first = load.fetch();
   manager.propagateAbortion();
   await assert.rejects(first, { name: "AbortError" });
   assert.equal(calls.length, 1);
   const second = load.fetch();
   assert.notEqual(second, first);
   manager.destroy(page);
   await assert.rejects(second, { name: "AbortError" });
   const call = manager.create();
   const once = fetchExtra({ fetchMethod, defaultUrl: "/slow", fetchManager: call });
   const third = once.fetch();
   const other = load.fetch();
   call.abortion();
   await assert.rejects(third, { name: "AbortError" });
   manager.abortion();
   assert.throws(() => load.fetch({ config: { signal: new AbortController().signal } }), /takes its abort signal from fetchManager/);
   other.catch(() => {});
});

test("flushing the timeout manager cancels a retry that is waiting", async () => {
   const timers = new TimeoutManager();
   const { calls, fetchMethod } = server(() => response(null, 500));
   const load = fetchExtra({ fetchMethod, defaultUrl: "/flaky", retry: 5, retryDelay: (tries) => tries * 10000, timeoutManager: timers });
   const pending = load.fetch();
   while (timers.size === 0) await new Promise((resolve) => setImmediate(resolve));
   timers.flush();
   await assert.rejects(pending, { name: "AbortError" });
   assert.equal(calls.length, 1);
});

test("waitFor lets a detail request reuse the row a list request brings back", async () => {
   const posts = indexExtra({ id: "primary" });
   const { calls, fetchMethod } = server((url) => url === "/api/posts" ? response([{ id: 1 }, { id: 2 }]) : response({ id: Number(url.split("/").at(-1)), single: true }));
   const list = fetchExtra({
      fetchMethod,
      defaultUrl: "/api/posts",
      cleanFetcher: (res) => res.json(),
      setter: (value, request, source) => {
         if (source === "fetch") posts.upsert(...value);
      },
   });
   const detail = fetchExtra({
      fetchMethod,
      defaultUrl: "/api/posts",
      cleanFetcher: (res) => res.json(),
      getter: ({ slug }) => posts.get(slug),
      setter: (value, request, source) => {
         if (source === "fetch") posts.upsert(value);
      },
      waitFor: () => list.pending(),
   });
   const all = list.fetch();
   const [two, three] = [detail.fetch({ slug: 2 }), detail.fetch({ slug: 3 })];
   assert.deepEqual(await two, { id: 2 });
   assert.deepEqual(await three, { id: 3, single: true });
   assert.equal((await all).length, 2);
   assert.deepEqual(calls.map((call) => call.url), ["/api/posts", "/api/posts/3"]);
   assert.deepEqual(detail.fetch({ slug: 3 }), { id: 3, single: true });
});

test("extra call arguments and configuration reach the fetch method", async () => {
   const { calls, fetchMethod } = server(() => "raw");
   const load = fetchExtra({ fetchMethod });
   assert.equal(await load.fetch({ url: "/x", method: "delete", config: { headers: { a: "1" } } }, "extra"), "raw");
   assert.deepEqual(calls[0].args, ["extra"]);
   assert.equal(calls[0].init.method, "DELETE");
   assert.deepEqual(calls[0].init.headers, { a: "1" });
   assert.throws(() => load.fetch(), /needs a url or a defaultUrl/);
   assert.throws(() => fetchExtra({ fetchMethod, retry: -1 }), /retry must be an integer/);
   assert.throws(() => fetchExtra({ fetchMethod, getter: 1 }), /getter, setter, cleanFetcher, cleanCacher, and waitFor must be functions/);
});
