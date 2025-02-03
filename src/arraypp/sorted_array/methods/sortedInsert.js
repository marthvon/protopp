import './searchSorted.js';

if(!Array.prototype.sortedInsert) 
Object.defineProperty(Array.prototype, 'sortedInsert', { value: function(value) {
   this.splice(Array.closestIndex(this.searchSorted(value)), 0, value);
}, writable:true});