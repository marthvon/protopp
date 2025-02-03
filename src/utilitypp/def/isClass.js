import { defineGlobalFunc } from '../helper.js';
defineGlobalFunc('isClass', function(obj) {
   return obj !== null && typeof obj === 'object' && (
      !(obj.constructor === Object || obj.constructor === Array)
   );
});