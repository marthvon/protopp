import { defineGlobalFunc } from '../helper.js';
defineGlobalFunc('matchOrdering', function(a, b) {
   return a < b? -1 : a === b? 0 : 1; 
});

defineGlobalFunc('matchOrderingP', function(a, b) {
   return a.lessThan(b)? -1 : a.isEquals(b)? 0 : 1; 
});