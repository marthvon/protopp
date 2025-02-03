import { defineGlobalFunc, globalContext } from "../helper.js";
defineGlobalFunc('isCustomClass', function(obj) {
   return obj !== null && typeof obj === 'object' && globalContext[obj.constructor.name] === undefined;
   //return obj.constructor.toString().startsWith('class');
});