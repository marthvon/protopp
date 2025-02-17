import '../../src/functionpp/index.js';

function testFunction() {
   return "Hello World";
}

function createTestMemo() {
   let a = 0;
   return () => {
      const temp = "Hello World"+a;
      a++; return temp;
   }
}

const testMemo1 = createTestMemo();
const testMemo2 = createTestMemo();
const testMemo3 = createTestMemo();
const testMemo4 = createTestMemo();

const debounce = testFunction.debounce(300);
const throttle = testFunction.throttle(300);
const memoize = testMemo1.memoize();
const memoizeFifo = testMemo2.memoizeFifo(3);
const memoizeLru = testMemo3.memoizeLru(3);
const memoizeLfu = testMemo4.memoizeLfu(3);

const obj = {a:1,b:2}
const deferrer = (function() {
   this.defer = () =>  delete obj['a'];
   this.defer = () => console.log("Hello World");
   for(let i = 0; i < 5; ++i); // do something
}).deferrable();

console.log([
   "Testing debounce => " + debounce() + " [Expected: Hello World]",
   "Testing debounce => " + debounce() + " [Expected: object Promise]",
   "Testing throttle => " + throttle()  + " [Expected: Hello World]",
   "Testing throttle => " + throttle()  + " [Expected: undefined]",
   "Testing memoize => " + memoize() + " [Expected: Hello World0]",
   "Testing memoize => " + memoize() + " [Expected: Hello World0]",

   "\nTesting Memoize FIFO with allocLimit: \n",
   "Testing memoizeFifo => " + memoizeFifo(1) + " [Expected: Hello World0]",
   "Testing memoizeFifo => " + memoizeFifo(2) + " [Expected: Hello World1]",
   "Testing memoizeFifo => " + memoizeFifo(3) + " [Expected: Hello World2]",
   "Testing memoizeFifo => " + memoizeFifo(3) + " [Expected: Hello World2]",
   "Testing memoizeFifo => " + memoizeFifo(4) + " [Expected: Hello World3]",
   "Testing memoizeFifo => " + memoizeFifo(1) + " [Expected: Hello World4]",
   
   "\nTesting Memoize LRU with allocLimit: \n",
   "Testing memoizeLru => " + memoizeLru(1) + " [Expected: Hello World0]",
   "Testing memoizeLru => " + memoizeLru(2) + " [Expected: Hello World1]",
   "Testing memoizeLru => " + memoizeLru(3) + " [Expected: Hello World2]",
   "Testing memoizeLru => " + memoizeLru(1) + " [Expected: Hello World0]",
   "Testing memoizeLru => " + memoizeLru(4) + " [Expected: Hello World3]",
   "Testing memoizeLru => " + memoizeLru(2) + " [Expected: Hello World4]",
   
   "\nTesting Memoize LFU with allocLimit: \n",
   "Testing memoizeLfu => " + memoizeLfu(1) + " [Expected: Hello World0]",
   "Testing memoizeLfu => " + memoizeLfu(2) + " [Expected: Hello World1]",
   "Testing memoizeLfu => " + memoizeLfu(3) + " [Expected: Hello World2]",
   "Testing memoizeLfu => " + memoizeLfu(3) + " [Expected: Hello World2]",
   "Testing memoizeLfu => " + memoizeLfu(2) + " [Expected: Hello World1]",
   "Testing memoizeLfu => " + memoizeLfu(4) + " [Expected: Hello World3]",
   "Testing memoizeLfu => " + memoizeLfu(1) + " [Expected: Hello World4]", ""
].join("\n"));

console.log("Testing deferrable => ");
deferrer();
console.log(JSON.stringify(obj)+ "\n");

const stater = (function(incr) {
   this.value += incr
   if(this.value > 5)
      return this.value;
   console.log(this.value);
   return stater(incr);
}).stateful({ value: 0 })

let temp = stater(1);
console.log("Testing stateful => " + temp + ' [Expected: 1 2 3 4 5 6]')
temp = stater(2);
console.log("Testing stateful => " + temp + ' [Expected: 2 4 6]'); 
