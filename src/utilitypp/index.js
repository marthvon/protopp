//completely independent
import { defineGlobalFunc } from './helper.js';

import './def/truthTable.js';
import './def/nullCoalesce.js';
import './def/isClass.js';
import './def/isCustomClass.js';

import '../stringpp/methods/indexOfOccurIn.js';
import '../objectpp/methods/letIt.js';

defineGlobalFunc('runIt', function(lambda) {
   return lambda();
});

// uses String.indexOfOccurIn and Object.let<...>
defineGlobalFunc('lineNoHere', function() {
   const stack = new Error().stack;
   if(stack === undefined)
      return -1;
   const start = stack.indexOfOccurIn('\n', 2);
   return stack.slice(start, stack.indexOf('\n', start+1)).match(/(\d+):/)
      ?.letz((it) => Number.parseInt(it[1])) || -1;
});