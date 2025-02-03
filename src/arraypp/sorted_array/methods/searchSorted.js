import '../../../numberpp/methods/precisionpp.js';

function searchSorted(self, value) {
   let left = 0;
   let right = self.length - 1;
   while(left <= right) {
      const mid = Math.floor((left+right)/2);
      if(self[mid].isEquals(value))
         return mid;
      if(self[mid].lessThan(value))
         left = mid+1;
      else
         right = mid-1;
   }
   return -Math.ceil((left+right)/2)-1;
}

function searchSortedCallback(self, sorting) {
   let left = 0;
   let right = self.length - 1;
   while(left <= right) {
      const mid = Math.floor((left+right)/2);
      const cmp = sorting(self[mid]);
      if(cmp === 0)
         return mid;
      if(cmp < 0)
         left = mid+1;
      else
         right = mid-1;
   }
   return -Math.ceil((left+right)/2)-1;
}

if(!Array.closestIndex)
Object.defineProperty(Array, 'closestIndex', { value: function(index) {
   if(index < 0)
      return -index-1;
   return index;
}});

if(!Array.prototype.searchSorted) 
Object.defineProperty(Array.prototype, 'searchSorted', { value: function(value) {
   return value instanceof Function? searchSortedCallback(this, value) : searchSorted(this, value);
}, writable:true});