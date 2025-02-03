import '../../src/numberpp/index.js';

const precisionPointErrorA = 0.2 + 0.1;
const precisionPointErrorB = 0.3 + 0.6; 
const precisionPointErrorAx10 = precisionPointErrorA*10;
const precisionPointErrorBxe9 = precisionPointErrorB*9.99999999999; 

console.log([
   '0.2 + 0.1 = ' + precisionPointErrorA,
   '0.3 + 0.6 = ' + precisionPointErrorB,
   '(0.2 + 0.1)*10 = ' + precisionPointErrorAx10,
   '(0.3 + 0.6)*9.99999999999 = ' + precisionPointErrorBxe9,
   "\nPrecision Point Error Test:\n",
   '0.2 + 0.1 isEqual to 0.3 => ' + precisionPointErrorA.isEquals(0.3) + " [Expected: true]",
   '0.3 + 0.6 isEqual to 0.9 => ' + precisionPointErrorB.isEquals(0.9) + " [Expected: true]",
   '0.2 + 0.1 greater than 0.3 => ' + precisionPointErrorA.greaterThan(0.3) + " [Expected: false]",
   '0.3 + 0.6 less than 0.9 => ' + precisionPointErrorB.lessThan(0.9) + " [Expected: false]",
   '0.3 is atleast (0.2 + 0.1) => ' + (0.3).atLeast(precisionPointErrorA) + " [Expected: true]",
   '0.9 is atmost (0.3 + 0.6) => ' + (0.9).atMost(precisionPointErrorB) + " [Expected: true]",
   '0.2 + 0.1 approximates to ' + precisionPointErrorA.approximate(),
   '0.3 + 0.6 approximates to ' + precisionPointErrorB.approximate(),
   "\nTesting Custom Math functions:\n",
   "Testing fract((0.1 + 0.2)*10) => " + Math.fract(precisionPointErrorA*10) + " [Expected: 0.0000000000000004]",
   //"Testing fract() => " + " [Expected: ]", has no test case where x - (floor(x)) is proven to output a floating point error
   //"Testing fractP() => " + " [Expected: ]", has no test case where x - (floor(x)) is proven to output a floating point error
   "Testing floorP((0.3 + 0.6)*9.999...) => " + Math.floorP(precisionPointErrorBxe9) + " [Expected: 8]",
].join("\n"));