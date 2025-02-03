if(!Array.justZip) 
Object.defineProperty(Array, 'justZip', { value: function(...arrs) {
   const maxLength = arrs.reduce((res, arr) => res < arr.length? (res = arr.length) : res, 0);
   const res = [];
   for(let i = 0; i < maxLength; ++i)
      res.push(arrs.map(arr => arr[i]));
   return res;
}, writable:true});

function zipTil(until, ...arrs) {
   const res = [];
   for(let i = 0; i < until; ++i)
      res.push(arrs.map(arr => arr[i]));
   return res;
}

function zipUntil(until, ...arrs) {
   const lastIndex = arrs.length - 1;
   const temp = {};
   for(let i = 0; i < arrs.length; ++i)
      if(temp.hasOwnProperty(arrs[i].length))
         temp[arrs[i].length].push( lastIndex-i );
      else
         temp[arrs[i].length] = [ lastIndex-i ];
   const lengthMap = Object.entries(temp)
      .map(([key, value]) => [ Number.parseInt(key), value ])
      .sort(([key1], [key2]) => key1-key2);
      
   const state = {
      index: 0,
      endCount: 0,
      endTruths: 0
   };
   let end = lengthMap.shift();
   const res = [];
   while(true) {
      if(end === undefined)
         break;
      if(end[0] === state.index) {
         state.endCount += end[1].length;
         for(const idx of end[1])
            state.endTruths |= (1 << idx);
         end = lengthMap.shift();
      }
      if(!until(state))
         break;
      res.push(arrs.map(arr => arr[state.index]));
      state.index++;
   }
   return res;
}

if(!Array.zipIt)
Object.defineProperty(Array, 'zipIt', { value: function(until, ...arrs) {
   return typeof until === 'number'? zipTil(until, ...arrs) : zipUntil(until, ...arrs);
}, writable:true});