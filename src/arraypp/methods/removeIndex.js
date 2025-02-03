if(!Array.prototype.removeIndex) 
Object.defineProperty(Array.prototype, 'removeIndex', { value: function(...indexes) {
   indexes.sort();
   let skip = indexes.shift();
   const res = [];
   for(let i = 0; i < this.length; ++i)
      if(skip !== i)
         res.push(this[i]);
      else
         skip = indexes.shift();
   return res;
}, writable:true});