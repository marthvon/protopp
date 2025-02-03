import '../../src/utilitypp/index.js';

class MyClass{};

const o = {}; const a = [];
const m = new Map(); const s = new Set();
const c = new MyClass();

console.log([
   "Testing lineNoHere => " + lineNoHere() + " [Expected: 10]", 
   "Testing isClass on Object => " + isClass(o) + " [Expected: false]",
   "Testing isClass on Array => " + isClass(a) + " [Expected: false]",
   "Testing isClass on Set => " + isClass(s) + " [Expected: true]",
   "Testing isClass on Map => " + isClass(m) + " [Expected: true]",
   "Testing isClass on Class => " + isClass(c) + " [Expected: true]",
   "Testing isCustomClass on Object => " + isCustomClass(o) + " [Expected: false]",
   "Testing isCustomClass on Array => " + isCustomClass(a) + " [Expected: false]",
   "Testing isCustomClass on Set => " + isCustomClass(s) + " [Expected: false]",
   "Testing isCustomClass on Map => " + isCustomClass(m) + " [Expected: false]",
   "Testing isCustomClass on Class => " + isCustomClass(c) + " [Expected: true]",
   "Testing nullCoalesce on undefined => " + nullCoalesce(undefined, "alternative") + " [Expected: alternative]",
   "Testing nullCoalesce on null => " + nullCoalesce(null, "alternative") + " [Expected: alternative]",
].join("\n"));