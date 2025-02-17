import '../../functionpp/static/isAsync.js';
import '../../objectpp/methods/deepCopy.js';
import '../../objectpp/methods/deepMerge.js';

if(!Function.prototype.stateful) 
Object.defineProperty(Function.prototype, 'stateful', { value: function(state, recurring) {
   if(Function.isAsync(this))
      throw new Error("async functions cannot be stateful() in case of an instance wherein it recursively calls itself");
   let inst;
   let calling = 0;
   return (...args) => {
      if(calling === 0)
         inst = state.deepCopyP().deepMerge(this ?? {});
      calling++;
      try {
         const ret = (recurring !== undefined && calling !== 1)? 
            recurring.apply(inst, args) 
            : this.apply(inst, args);
         calling--;
         return ret;
      } catch(err) {
         calling--;
         throw err;
      }
   }
}, writable:true});