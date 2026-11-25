export async function settlePending(cache, key, pending) {
   cache.set(key, pending);
   try {
      return await pending;
   } catch(err) {
      if((typeof cache.peek === 'function' ? cache.peek(key) : cache.get(key)) === pending)
         cache.delete(key);
      throw err;
   }
}
