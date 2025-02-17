import './paginateIt.js';

if(!Array.prototype.evenlySplit) 
Object.defineProperty(Array.prototype, 'evenlySplit', { value: function(split, remainderAtEnd=true) {
   const remainder = this.length % split;
   const pageSize = (this.length - remainder) / split;
   if(remainderAtEnd || remainder === 0)
      return this.paginateIt(pageSize);
   return [
      this.slice(0, remainder),
      ...this.slice(remainder).paginateIt(pageSize)
   ];
}, writable:true});