import ZipIteratorHandler from "../../classpp/ZipIteratorHandler.js";

if(!Array.zipItr) 
Object.defineProperty(Array, 'zipItr', { value: function(...arrs) {
   return new ZipIteratorHandler(arrs.map(arr => arr.values()));
}, writable:true});