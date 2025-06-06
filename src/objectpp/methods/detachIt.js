import './deepMerge.js';

if(!Object.prototype.detachIt) 
Object.defineProperty(Object.prototype, 'detachIt', { value: function(child_field, ...references) {
   if(!(this.constructor === Object || Array.isArray(this)))
      throw new Error('detachIt can only be called by typeof pure object');
   const temp = this[child_field];
   delete this[child_field];
   const fields = {};
   for(const reference of references)
      if(reference.constructor === Object || Array.isArray(reference))
         for(const [ key, ref ] of Object.entries(reference))
            fields[ref] = this[key];
      else
         fields[reference] = this[reference];
   if(Array.isArray(temp))
      for(const t of temp)
         t.deepMerge(fields);
   else
      temp.deepMerge(fields);
   return temp;
}, writable:true});