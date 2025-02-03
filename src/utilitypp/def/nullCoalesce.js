import { defineGlobalFunc } from '../helper.js';
defineGlobalFunc('nullCoalesce', function(value, Or) {
   if(value === null || value === undefined)
      return Or instanceof Function? Or() : Or;
   return value;
});