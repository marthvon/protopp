import '../utilitypp/def/nullCoalesce.js';
import '../utilitypp/def/truthTable.js';
import '../arraypp/static/zipItr.js';

export default class ZipIteratorHandler {
   constructor(values) {
      this.values = values;
   }
   forEach({cond = (state)=>this.values.length !== state.endCount, d0}) {
      const state = {
         index: 0,
         endCount: 0,
         endTruths: 0
      };
      do {
         var temp = this.values.map((itr) => itr.next());
         state.endCount = 0;
         state.endTruths = truthTable(...temp.map(t => {
            if(t.done) ++state.endCount;
            return t.done;
         }));
      } while(
         cond(state) && nullCoalesce(
            d0(temp.map(t => t.value), state)
         , true) && (++state.index)
      );
   }
   reduce({cond = (state)=>this.values.length !== state.endCount, d0}, intialValue) {
      const state = {
         index: 0,
         endCount: 0,
         endTruths: 0
      };
      let res = intialValue;
      while(true) {
         let temp = this.values.map((itr) => itr.next());
         state.endCount = 0;
         state.endTruths = truthTable(...temp.map(t => {
            if(t.done) ++state.endCount;
            return t.done;
         }));
         if(!cond(state))
            break; 
         res = d0(res, temp.map(t => t.value), state); 
         ++state.index;
      };
      return res;
   }
   map({cond = (state)=>this.values.length !== state.endCount, d0}) {
      const state = {
         index: 0,
         endCount: 0,
         endTruths: 0
      };
      let map = [];
      while(true) {
         let temp = this.values.map((itr) => itr.next());
         state.endCount = 0;
         state.endTruths = truthTable(...temp.map(t => {
            if(t.done) ++state.endCount;
            return t.done;
         }));
         if(!cond(state))
            break; 
         const ret = d0(temp.map(t => t.value), state); 
         if(ret !== undefined)
            map.push(ret);
         ++state.index;
      };
      return map;
   }
}