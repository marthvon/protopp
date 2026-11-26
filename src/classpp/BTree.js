export const MIN = Symbol('BTree.MIN');
export const MAX = Symbol('BTree.MAX');

function rank(value) {
   if(value === undefined)
      return 0;
   else if(value === null)
      return 1;
   switch(typeof value) {
      case 'boolean': return 2;
      case 'number': return Number.isNaN(value)? 4 : 3;
      case 'bigint': return 3;
      case 'string': return 5;
   }
   if(value instanceof Date)
      return 6;
   else if(Array.isArray(value))
      return 7;
   return 8;
}

function order(a, b) {
   return a < b? -1 : (a > b? 1 : 0);
}

export function compareValues(a, b) {
   if(a === b)
      return 0;
   else if(a === MIN || b === MAX)
      return -1;
   else if(a === MAX || b === MIN)
      return 1;
   const left = rank(a), right = rank(b);
   if(left !== right)
      return left < right? -1 : 1;
   switch(left) {
      case 6: {
         const x = a.getTime(), y = b.getTime();
         if(Number.isNaN(x) || Number.isNaN(y))
            return Number.isNaN(x)? (Number.isNaN(y)? 0 : 1) : -1;
         return order(x, y);
      }
      case 7: {
         const length = Math.min(a.length, b.length);
         for(let i = 0; i < length; ++i) {
            const result = compareValues(a[i], b[i]);
            if(result !== 0)
               return result;
         }
         return order(a.length, b.length);
      }
      case 8:
         return order(String(a), String(b));
      default:
         return order(a, b);
   }
}

function leaf() {
   return { leaf: true, keys: [], values: [], prev: null, next: null };
}

function branch(keys, children) {
   return { leaf: false, keys, children };
}

function lowerBound(keys, key, compare) {
   let lo = 0, hi = keys.length;
   while(lo < hi) {
      const mid = (lo + hi) >>> 1;
      if(compare(keys[mid], key) < 0)
         lo = mid + 1;
      else
         hi = mid;
   }
   return lo;
}

function upperBound(keys, key, compare) {
   let lo = 0, hi = keys.length;
   while(lo < hi) {
      const mid = (lo + hi) >>> 1;
      if(compare(keys[mid], key) <= 0)
         lo = mid + 1;
      else
         hi = mid;
   }
   return lo;
}

function findLeaf(tree, key, nodes, indexes) {
   let node = tree.root;
   while(!node.leaf) {
      const index = upperBound(node.keys, key, tree.compare);
      if(nodes) {
         nodes.push(node);
         indexes.push(index);
      }
      node = node.children[index];
   }
   return node;
}

function splitUp(tree, node, nodes, indexes) {
   const right = leaf();
   const mid = node.keys.length >>> 1;
   right.keys = node.keys.splice(mid);
   right.values = node.values.splice(mid);
   right.next = node.next;
   if(right.next)
      right.next.prev = right;
   right.prev = node;
   node.next = right;
   let separator = right.keys[0], left = node, sibling = right;
   for(let level = nodes.length - 1; level >= 0; --level) {
      const parent = nodes[level], index = indexes[level];
      parent.keys.splice(index, 0, separator);
      parent.children.splice(index + 1, 0, sibling);
      if(parent.children.length <= tree.order)
         return;
      const cut = Math.ceil(parent.children.length / 2);
      sibling = branch(parent.keys.splice(cut), parent.children.splice(cut));
      separator = parent.keys.pop();
      left = parent;
   }
   tree.root = branch([ separator ], [ left, sibling ]);
}

function rebalance(tree, node, nodes, indexes) {
   const leafMin = tree.order >>> 1;
   const branchMin = Math.ceil(tree.order / 2);
   for(let level = nodes.length - 1; level >= 0; --level) {
      if(node.leaf? node.keys.length >= leafMin : node.children.length >= branchMin)
         return;
      const parent = nodes[level], index = indexes[level];
      const left = index > 0? parent.children[index - 1] : null;
      const right = index < parent.children.length - 1? parent.children[index + 1] : null;
      if(node.leaf) {
         if(left && left.keys.length > leafMin) {
            node.keys.unshift(left.keys.pop());
            node.values.unshift(left.values.pop());
            parent.keys[index - 1] = node.keys[0];
            return;
         } else if(right && right.keys.length > leafMin) {
            node.keys.push(right.keys.shift());
            node.values.push(right.values.shift());
            parent.keys[index] = right.keys[0];
            return;
         } else if(left) {
            left.keys.push(...node.keys);
            left.values.push(...node.values);
            left.next = node.next;
            if(node.next)
               node.next.prev = left;
            parent.keys.splice(index - 1, 1);
            parent.children.splice(index, 1);
         } else {
            node.keys.push(...right.keys);
            node.values.push(...right.values);
            node.next = right.next;
            if(right.next)
               right.next.prev = node;
            parent.keys.splice(index, 1);
            parent.children.splice(index + 1, 1);
         }
      } else if(left && left.children.length > branchMin) {
         node.children.unshift(left.children.pop());
         node.keys.unshift(parent.keys[index - 1]);
         parent.keys[index - 1] = left.keys.pop();
         return;
      } else if(right && right.children.length > branchMin) {
         node.children.push(right.children.shift());
         node.keys.push(parent.keys[index]);
         parent.keys[index] = right.keys.shift();
         return;
      } else if(left) {
         left.keys.push(parent.keys[index - 1], ...node.keys);
         left.children.push(...node.children);
         parent.keys.splice(index - 1, 1);
         parent.children.splice(index, 1);
      } else {
         node.keys.push(parent.keys[index], ...right.keys);
         node.children.push(...right.children);
         parent.keys.splice(index, 1);
         parent.children.splice(index + 1, 1);
      }
      node = parent;
   }
   if(!tree.root.leaf && tree.root.children.length === 1)
      tree.root = tree.root.children[0];
}

function firstLeaf(tree) {
   let node = tree.root;
   while(!node.leaf)
      node = node.children[0];
   return node;
}

function lastLeaf(tree) {
   let node = tree.root;
   while(!node.leaf)
      node = node.children[node.children.length - 1];
   return node;
}

function tighter(compare, a, b, preferLarger) {
   if(a === undefined)
      return b;
   else if(b === undefined)
      return a;
   const result = compare(a.key, b.key);
   if(result === 0)
      return a.exclusive? a : b;
   return (result > 0) === preferLarger? a : b;
}

function boundsOf(compare, { gt, gte, lt, lte } = {}) {
   return {
      lower: tighter(compare, gt === undefined? undefined : { key: gt, exclusive: true }, gte === undefined? undefined : { key: gte, exclusive: false }, true),
      upper: tighter(compare, lt === undefined? undefined : { key: lt, exclusive: true }, lte === undefined? undefined : { key: lte, exclusive: false }, false),
   };
}

export default class BTree {
   constructor(compare = compareValues, order = 32) {
      if(typeof compare !== 'function')
         throw new TypeError('BTree compare must be a function');
      else if(!Number.isInteger(order) || order < 3)
         throw new Error('BTree order must be an integer greater than 2');
      this.compare = compare;
      this.order = order;
      this.root = leaf();
      this.size = 0;
   }
   has(key) {
      const node = findLeaf(this, key);
      const at = lowerBound(node.keys, key, this.compare);
      return at < node.keys.length && this.compare(node.keys[at], key) === 0;
   }
   get(key) {
      const node = findLeaf(this, key);
      const at = lowerBound(node.keys, key, this.compare);
      return at < node.keys.length && this.compare(node.keys[at], key) === 0? node.values[at] : undefined;
   }
   set(key, value) {
      const nodes = [], indexes = [];
      const node = findLeaf(this, key, nodes, indexes);
      const at = lowerBound(node.keys, key, this.compare);
      if(at < node.keys.length && this.compare(node.keys[at], key) === 0) {
         node.values[at] = value;
         return this;
      }
      node.keys.splice(at, 0, key);
      node.values.splice(at, 0, value);
      ++this.size;
      if(node.keys.length > this.order)
         splitUp(this, node, nodes, indexes);
      return this;
   }
   delete(key) {
      const nodes = [], indexes = [];
      const node = findLeaf(this, key, nodes, indexes);
      const at = lowerBound(node.keys, key, this.compare);
      if(at >= node.keys.length || this.compare(node.keys[at], key) !== 0)
         return false;
      node.keys.splice(at, 1);
      node.values.splice(at, 1);
      --this.size;
      rebalance(this, node, nodes, indexes);
      return true;
   }
   clear() {
      this.root = leaf();
      this.size = 0;
   }
   first() {
      const node = firstLeaf(this);
      return node.keys.length? [ node.keys[0], node.values[0] ] : undefined;
   }
   last() {
      const node = lastLeaf(this);
      const at = node.keys.length - 1;
      return at >= 0? [ node.keys[at], node.values[at] ] : undefined;
   }
   *entries(range = {}) {
      const compare = this.compare;
      const { lower, upper } = boundsOf(compare, range);
      if(range.reverse) {
         let node, at;
         if(upper) {
            node = findLeaf(this, upper.key);
            at = (upper.exclusive? lowerBound : upperBound)(node.keys, upper.key, compare) - 1;
         } else {
            node = lastLeaf(this);
            at = node.keys.length - 1;
         }
         while(node) {
            for(; at >= 0; --at) {
               if(lower && (lower.exclusive? compare(node.keys[at], lower.key) <= 0 : compare(node.keys[at], lower.key) < 0))
                  return;
               yield [ node.keys[at], node.values[at] ];
            }
            node = node.prev;
            at = node? node.keys.length - 1 : -1;
         }
      } else {
         let node, at;
         if(lower) {
            node = findLeaf(this, lower.key);
            at = (lower.exclusive? upperBound : lowerBound)(node.keys, lower.key, compare);
         } else {
            node = firstLeaf(this);
            at = 0;
         }
         while(node) {
            for(; at < node.keys.length; ++at) {
               if(upper && (upper.exclusive? compare(node.keys[at], upper.key) >= 0 : compare(node.keys[at], upper.key) > 0))
                  return;
               yield [ node.keys[at], node.values[at] ];
            }
            node = node.next;
            at = 0;
         }
      }
   }
   *keys(range) {
      for(const [ key ] of this.entries(range))
         yield key;
   }
   *values(range) {
      for(const [ , value ] of this.entries(range))
         yield value;
   }
   [Symbol.iterator]() {
      return this.entries();
   }
}
