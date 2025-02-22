export default class SyncResult<T, E extends Error> {
   private result?: T; 
   private error?: E|SuppressedError;
   static resolve<T>(result:T);
   static fail<E extends Error>(error:E|SuppressedError);
   then<R>(d0:(result:T)=>R) : SyncResult<R,E>;
   catch<R>(d0:(error:E|SuppressedError)=>R|E) : SyncResult<R,E>;
   unwrap<R>(or?:R|((err:E)=>R)) : T|R;
   expect(err?:string|Error) : T;
   throwOnFail();
   isFail() : boolean;
}