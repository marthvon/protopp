/** 
* ideally, implemented as such in some context (this.setTimeout || setTimeout)(...).
* And, if due to some event, like page reload/switching or something that ends a process.
* then, timeoutManager.flush() to cleanup ongoing timeouts
*/ 
export default class TimeoutManager {
   setTimeout(callback: () => void, ms?: number);
   clearTimeout(id: number) : boolean;
   flush();
   awaitRemaining() : Promise<undefined>;
}