/** 
* ideally, implemented as such in some context (this.setInterval || setInterval)(...).
* And, if due to some event, like page reload/switching or something that ends a process.
* then, intervalManager.flush() to cleanup ongoing intervals
*/ 
export default class IntervalManager {
   setInterval(callback: () => void, ms?: number);
   clearInterval(id: number) : boolean;
   flush();
   awaitRemaining() : Promise<undefined>;
}