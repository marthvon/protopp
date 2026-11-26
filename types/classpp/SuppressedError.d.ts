export class SuppressedError extends Error {
   private errorStack : Array<Error>;
   constructor(...errors: Error[]);
   suppressed(err:Error) : this;
   suppressedThrow(err:Error) : never;
   handleTop(): Error;
   topRecovered() : this;
   isHandled() : boolean;
   throw() : void;
   forEach(d0: (error: Error, index: number) => void) : void;
   map<T>(d0: (error: Error, index: number) => T) : Array<T>;
}

export default SuppressedError;
