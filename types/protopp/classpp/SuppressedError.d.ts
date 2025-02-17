export class SuppressedError extends Error {
   private errorStack : Array<Error>;
   constructor(...errors: Error[]);
   suppressed(err:Error) : this;
   suppressedThrow(err:Error);
   handleTop(): Error;
   topRecovered() : this;
   isHandled() : boolean;
   throw();
   forEach(d0);
   map<T>(d0) : Array<T>;
}