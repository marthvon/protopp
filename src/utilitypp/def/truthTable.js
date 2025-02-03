import { defineGlobalFunc } from '../helper.js';
defineGlobalFunc('truthTable', function(...clauses) {
   let bit = clauses.length;
   return clauses.reduce((res,val) => (res |= (val << (--bit))), 0);
});