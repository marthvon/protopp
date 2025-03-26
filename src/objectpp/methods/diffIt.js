if(!Object.prototype.diffIt)
Object.defineProperty(Object.prototype, 'diffIt', { value: function(other) {
   const keySet = new Set(Object.keys(this));
   const otherKeySet = new Set(Object.keys(other));
   return {
      updated: Array.from(keySet.intersection(otherKeySet)).filter((field) => this[field] !== other[field]),
      inserted: Array.from(otherKeySet.difference(keySet)),
      deleted: Array.from(keySet.difference(otherKeySet))
   }
}, writable:true});