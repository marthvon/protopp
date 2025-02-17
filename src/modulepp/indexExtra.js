
/**
 * schema can be like
 * {
 *    fieldA: undefined
 *    fieldB: { indexed/unique, and ordered? composite with <...>? }
 * }
 * enum {
 *    indexed, => has apsert but doesn't have upsert, no filters for list, get returns list
 *    unique, => has upsert but doesn't have apsert, no filters for list, get returns one object
 *    uniquelyOrdered, => has upsert but doesn't have apsert, can be filtered in list (min,max,inbetween), get returns one object
 *    indexedOrdered => has apsert but doesn't have upsert, can be filtered in list (min,max,inbetween), get returns list
 *       ---  nvm , should schema be Map to store composite [fieldA, fieldB]: ...
 *    uniquelyComposite => has upsert when all fields present, also has apsert when missing(cant find),
 *       get returns one object or list of object if all keys isn't entered.... scratch that.... only  
 *    modify apsert to upsert when all fields are present unless if one field is missing or same for get...
 * }
 * (min,max,inbetween) either built in to primitive, or self defined by isEquals/greaterThan/lessThan
 * or custom callback is required?
 * 
 * when indexed values is updated, make sure to handle changes too?
 * 
 * think about later.. there, is normal sorting but also radix sorting, or data structure like b-trees
 * think about paginate later, think about local/client side db store later... important to create option to use AM or DB when querying client side
 * 
 * important to store paginate token/url but defer/async update of order/indexed list upon retrieval... prioritize resolution of Promise for get Caller.
 * 
 * when index/ get list is called... important to bottle neck subsequent individual fetch get/:id calls to wait for this get list call to finish and check
 * if id is already retrieved, no double calls, otherwise call again?
 */
import '../arraypp/methods/combineUniquely.js';
import '../objectpp/methods/flipIt.js';
import '../objectpp/methods/appendInsert.js';

export function indexExtra(attributes, indices, uniques, orderBy, uniqueComposites, onDealloc=undefined) {
   attributes = attributes.combineUniquely(indices, uniques);
   return {
      raw_data: [],
      uniques: indices.flipIt(),
      indices: uniques.flipIt(),
      ordered_list: {},
      list: (queryParams) => {

      },
      get: (identifier) => {
         return this.indices[identifier.type][identifier.id];
      },
      xpsert: (...items) => {

      },
      delete: (...items) => {
         for(const item of items) {
            // remove in raw data
            // async remove weakrefs in uniques indices, ordered_list
         }
      }
   };
}