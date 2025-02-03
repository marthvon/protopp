if(!Function.prototype.stateful) 
Object.defineProperty(Function.prototype, 'stateful', { value: function(state, root) {
   let inst;
   let calling = 0;
   return (...args) => {
      if(calling === 0) 
         inst = state.deepCopyP(); // state.deepCopy();
      const ret = ((calling++) === 1 && root)? 
         root.apply(inst, ...args) 
         : this.apply(inst, ...args);
      calling--;
      return ret;
   }
}, writable:true});