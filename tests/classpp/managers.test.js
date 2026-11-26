import assert from "node:assert/strict";
import test from "node:test";
import TimeoutManager, { TimeoutManager as NamedTimeoutManager } from "../../min/classpp/TimeoutManager.js";
import IntervalManager from "../../min/classpp/IntervalManager.js";
import FetchManager from "../../min/classpp/FetchManager.js";
import Observable from "../../min/classpp/Observable.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("timeout manager runs, clears, flushes, and waits for what is left", async () => {
   assert.equal(TimeoutManager, NamedTimeoutManager);
   const timers = new TimeoutManager();
   const ran = [];
   timers.setTimeout((value) => ran.push(value), 5, "a");
   const cleared = timers.setTimeout(() => ran.push("cleared"), 5);
   assert.equal(timers.clearTimeout(cleared), true);
   assert.equal(timers.clearTimeout(cleared), false);
   assert.equal(timers.size, 1);
   await timers.awaitRemaining();
   assert.deepEqual(ran, ["a"]);
   assert.equal(timers.size, 0);
   await timers.awaitRemaining();
   await timers.delay(1);
   const flushed = timers.delay(10000);
   timers.flush();
   await assert.rejects(flushed, { name: "AbortError" });
   const controller = new AbortController();
   const aborted = timers.delay(10000, controller.signal);
   controller.abort("left the page");
   await assert.rejects(aborted, (reason) => reason === "left the page");
   await assert.rejects(timers.delay(1, controller.signal), (reason) => reason === "left the page");
   assert.equal(timers.size, 0);
});

test("interval manager clears only the intervals it started", async () => {
   const intervals = new IntervalManager();
   let ticks = 0;
   const id = intervals.setInterval(() => ++ticks, 1);
   await sleep(25);
   assert.ok(ticks > 0);
   assert.equal(intervals.clearInterval(id), true);
   assert.equal(intervals.clearInterval(id), false);
   const stopped = ticks;
   await sleep(10);
   assert.equal(ticks, stopped);
   intervals.setInterval(() => ++ticks, 1);
   intervals.flush();
   assert.equal(intervals.size, 0);
});

test("fetch manager aborts its own signal, cascades to children, and destroys a child", () => {
   const root = new FetchManager();
   const page = root.create();
   const first = root.getSignal();
   const childFirst = page.getSignal();
   root.abortion();
   assert.equal(first.aborted, true);
   assert.equal(childFirst.aborted, false);
   assert.equal(root.getSignal().aborted, false);
   root.propagateAbortion("navigated");
   assert.equal(childFirst.aborted, true);
   assert.equal(childFirst.reason, "navigated");
   const childNext = page.getSignal();
   assert.equal(root.destroy(page), true);
   assert.equal(childNext.aborted, true);
   assert.equal(root.destroy(page), false);
});

test("observable unsubscribes only the callback it is given", () => {
   const observed = new Observable(1);
   const seen = [];
   const a = (value) => seen.push(["a", value]);
   const b = (value) => seen.push(["b", value]);
   observed.subscribe(a);
   const stop = observed.subscribe(b);
   observed.unsubscribe(() => {});
   observed.value = 2;
   stop();
   observed.value = (previous) => previous + 1;
   assert.deepEqual(seen, [["a", 2], ["b", 2], ["a", 3]]);
   assert.equal(observed.value, 3);
});
