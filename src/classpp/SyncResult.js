import SuppressedError from "./SuppressedError.js";

export default class SyncResult {
   static resolve(result) {
      const temp = new SyncResult();
      temp.result = result;
      return temp
   }
   static fail(error) {
      const temp = new SyncResult();
      temp.error = error;
      return temp;
   }
   then(d0) {
      if(!this.hasOwnProperty('result'))
         return this;
      try {
         const temp = d0(this.result);
         if(temp === undefined)
            return this;
         return SyncResult.resolve(temp);
      } catch(e) {
         return SyncResult.fail(e);
      }
   }
   catch(d0) {
      if(!this.hasOwnProperty('error'))
         return this;
      try {
         const temp = d0(this.error);
         if(temp === undefined)
            return this;
         else if(temp instanceof Error)
            return SyncResult.fail(temp);
         return SyncResult.resolve(temp);
      } catch(e) {
         if(this.error instanceof SuppressedError)
            this.error.suppressed(e);
         else
            this.error = new SuppressedError(e, this.error);
         return this;
      }
   }
   unwrap(or) {
      if(this.hasOwnProperty('result'))
         return this.result;
      if(or !== undefined)
         return or instanceof Function? or(this.error) : or;
      throw this.error;
   }
   expect(err) {
      if(this.hasOwnProperty('result'))
         return this.result;
      throw err === undefined? this.error : (
         typeof err === 'string'? new Error(err) 
            : err
      );
   }
   throwOnFail() {
      if(this.hasOwnProperty('error'))
         throw this.error;
   }
   isFail() {
      return this.hasOwnProperty('error');
   }
}