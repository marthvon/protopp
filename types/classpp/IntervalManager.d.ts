/**
* ideally, implemented as such in some context (this.setInterval || setInterval)(...).
* And, if due to some event, like page reload/switching or something that ends a process.
* then, intervalManager.flush() to cleanup ongoing intervals
*/
export class IntervalManager {
   readonly size: number;
   setInterval<A extends any[]>(callback: (...args: A) => void, ms?: number, ...args: A): ReturnType<typeof setInterval>;
   clearInterval(id: ReturnType<typeof setInterval>): boolean;
   flush(): void;
}

export default IntervalManager;
