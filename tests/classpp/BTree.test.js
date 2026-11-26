import assert from "node:assert/strict";
import test from "node:test";
import BTree, { MAX, MIN, compareValues } from "../../min/classpp/BTree.js";

function random(seed) {
   return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}

function check(tree) {
   const leafMin = tree.order >>> 1;
   const branchMin = Math.ceil(tree.order / 2);
   const leaves = [];
   let depth = -1;
   let count = 0;
   (function visit(node, low, high, level, isRoot) {
      if (node.leaf) {
         if (depth === -1) depth = level;
         assert.equal(level, depth, "every leaf sits at the same depth");
         if (!isRoot) assert.ok(node.keys.length >= leafMin && node.keys.length <= tree.order, "leaf fill stays in bounds");
         assert.equal(node.keys.length, node.values.length);
         node.keys.forEach((key, i) => {
            if (i) assert.ok(tree.compare(node.keys[i - 1], key) < 0, "leaf keys ascend");
            if (low !== undefined) assert.ok(tree.compare(key, low) >= 0, "leaf keys are at least the left separator");
            if (high !== undefined) assert.ok(tree.compare(key, high) < 0, "leaf keys are below the right separator");
         });
         count += node.keys.length;
         leaves.push(node);
         return;
      }
      assert.equal(node.keys.length, node.children.length - 1);
      if (isRoot) assert.ok(node.children.length >= 2, "an inner root has two children");
      else assert.ok(node.children.length >= branchMin && node.children.length <= tree.order, "branch fill stays in bounds");
      node.children.forEach((child, i) => visit(child, i ? node.keys[i - 1] : low, i < node.keys.length ? node.keys[i] : high, level + 1, false));
   })(tree.root, undefined, undefined, 0, true);
   assert.equal(count, tree.size);
   leaves.forEach((node, i) => {
      assert.equal(node.prev, i ? leaves[i - 1] : null);
      assert.equal(node.next, i < leaves.length - 1 ? leaves[i + 1] : null);
   });
}

function expectRange(sorted, { gt, gte, lt, lte, reverse }) {
   const kept = sorted.filter((key) => (gt === undefined || key > gt) && (gte === undefined || key >= gte)
      && (lt === undefined || key < lt) && (lte === undefined || key <= lte));
   return reverse ? kept.reverse() : kept;
}

test("random inserts and deletes keep every B+tree invariant and match a sorted oracle", () => {
   for (const order of [3, 4, 5, 8, 32]) {
      const next = random(order * 7919);
      const tree = new BTree(compareValues, order);
      const oracle = new Map();
      for (let step = 0; step < 6000; ++step) {
         const key = Math.floor(next() * 400);
         if (next() < 0.55) {
            tree.set(key, `v${step}`);
            oracle.set(key, `v${step}`);
         } else assert.equal(tree.delete(key), oracle.delete(key));
         if (step % 97 === 0 || order === 3) check(tree);
      }
      check(tree);
      const sorted = [...oracle.keys()].sort((a, b) => a - b);
      assert.deepEqual([...tree.keys()], sorted);
      assert.deepEqual([...tree.values()], sorted.map((key) => oracle.get(key)));
      for (const key of [-1, 0, 7, 199, 200, 399, 400]) {
         assert.equal(tree.has(key), oracle.has(key));
         assert.equal(tree.get(key), oracle.get(key));
      }
      for (let probe = 0; probe < 300; ++probe) {
         const range = {};
         if (next() < 0.5) range[next() < 0.5 ? "gt" : "gte"] = Math.floor(next() * 420) - 10;
         if (next() < 0.5) range[next() < 0.5 ? "lt" : "lte"] = Math.floor(next() * 420) - 10;
         range.reverse = next() < 0.5;
         assert.deepEqual([...tree.keys(range)], expectRange(sorted, range), JSON.stringify({ order, range }));
      }
      for (const key of sorted) tree.delete(key);
      check(tree);
      assert.equal(tree.size, 0);
      assert.equal(tree.first(), undefined);
   }
});

test("set replaces equal keys, first and last read the ends, and both range bounds take the tighter one", () => {
   const tree = new BTree();
   for (const key of [5, 1, 9, 3, 7]) tree.set(key, key * 10);
   tree.set(3, "three");
   assert.equal(tree.size, 5);
   assert.equal(tree.get(3), "three");
   assert.deepEqual(tree.first(), [1, 10]);
   assert.deepEqual(tree.last(), [9, 90]);
   assert.deepEqual([...tree.keys({ gt: 3, gte: 3 })], [5, 7, 9]);
   assert.deepEqual([...tree.keys({ gte: 5, gt: 1, lt: 9, lte: 9 })], [5, 7]);
   assert.deepEqual([...tree.keys({ gte: 4, lte: 8, reverse: true })], [7, 5]);
   assert.deepEqual([...tree], [[1, 10], [3, "three"], [5, 50], [7, 70], [9, 90]]);
   tree.clear();
   assert.deepEqual([...tree], []);
   assert.throws(() => new BTree(compareValues, 2), /order must be an integer greater than 2/);
   assert.throws(() => new BTree(1), /compare must be a function/);
});

test("compareValues gives every value a place in one total order", () => {
   const date = new Date(5);
   const object = { toString: () => "z" };
   const shuffled = [object, [1, 2], "b", NaN, true, null, date, 3n, [1], -1, MAX, "a", false, MIN, new Date(Number.NaN), 2];
   const sorted = shuffled.slice().sort(compareValues);
   assert.deepEqual(sorted.slice(0, 7), [MIN, null, false, true, -1, 2, 3n]);
   assert.ok(Number.isNaN(sorted[7]));
   assert.deepEqual(sorted.slice(8, 11), ["a", "b", date]);
   assert.ok(Number.isNaN(sorted[11].getTime()));
   assert.deepEqual(sorted.slice(12), [[1], [1, 2], object, MAX]);
   assert.equal(compareValues(MIN, undefined), -1);
   assert.equal(compareValues(undefined, null), -1);
   assert.equal(compareValues(undefined, undefined), 0);
   assert.equal(compareValues([1, MAX], [1, 999, 2]), 1);
   assert.equal(compareValues([1], [1, MIN]), -1);
});
