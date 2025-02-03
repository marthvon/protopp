import './removeIndex.js';
import '../../numberpp/methods/precisionpp.js';

function removeEquals(self, value, times) {
   let j = 0; const rmIdx = [];
   for(let i = 0; i !== self.length; ++i) {
      if(value !== self[i])
         continue;
      rmIdx.push(i);
      if((++j) === times)
         break;
   }
   return rmIdx;
}

function removeIsEquals(self, value, times) {
   let j = 0; const rmIdx = [];
   for(let i = 0; i !== self.length; ++i) {
      if(!value.isEquals(self[i]))
         continue;
      rmIdx.push(i);
      if((++j) === times)
         break;
   }
   return rmIdx;
}

function removeCallback(self, cond, times) {
   let j = 0; const rmIdx = [];
   for(let i = 0; i !== self.length; ++i) {
      if(!cond(self[i]))
         continue;   
      rmIdx.push(i);
      if((++j) === times)
         break;
   }
   return rmIdx;
}

if(!Array.prototype.removeValue) 
Object.defineProperty(Array.prototype, 'removeValue', { value: function(value, times=-1) {
   return this.removeIndex(...(value instanceof Function? 
      removeCallback(this, value, times) : (value.hasOwnProperty('isEquals')? 
            removeIsEquals(this, value, times) : removeEquals(this, value, times)
   )));
}, writable:true});