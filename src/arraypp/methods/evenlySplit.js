import './paginateIt.js';

if(!Array.prototype.evenlySplit) 
Object.defineProperty(Array.prototype, 'evenlySplit', { value: function(split, remainderAtEnd=true) {
   if(!Number.isInteger(split) || split < 1)
      throw new Error('evenlySplit split must be an integer greater than 0');
   const remainder = this.length % split;
   const pageSize = (this.length - remainder) / split;
   if(!Number.isInteger(pageSize) || pageSize < 1)
      throw new Error('evenlySplit page size must be an integer greater than 0');
   if(remainderAtEnd || remainder === 0)
      return this.paginateIt(pageSize);
   return [
      this.slice(0, remainder),
      ...this.slice(remainder).paginateIt(pageSize)
   ];
}, writable:true});