if(!Array.prototype.paginateIt) 
Object.defineProperty(Array.prototype, 'paginateIt', { value: function(pageSize) {
   if(this.length === 0)
      return [];
   const res = [];
   let i = 0;
   while(true) {
      const next = i+pageSize;
      if(next > this.length) {
         res.push(this.slice(i, this.length))
         break;
      }
      res.push(this.slice(i, next))
      if((i = next) === this.length)
         break;
   }
   return res;
}, writable:true});