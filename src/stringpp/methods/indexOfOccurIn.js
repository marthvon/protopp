if(!String.prototype.indexOfOccurIn) 
Object.defineProperty(String.prototype, 'indexOfOccurIn', { value: function(searchString, occuring) {
   let position = 0;
   for(let i = 0; i < occuring; ++i)
      if((position = (this.indexOf(searchString, position)+1)) === 0)
         break;
   return position-1;
}, writable:true});