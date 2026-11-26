/**
* ideally, implemented as such in some context (this.setTimeout || setTimeout)(...).
* And, if due to some event, like page reload/switching or something that ends a process.
* then, timeoutManager.flush() to cleanup ongoing timeouts
*/
export class TimeoutManager {
   readonly size: number;
   setTimeout<A extends any[]>(callback: (...args: A) => void, ms?: number, ...args: A): ReturnType<typeof setTimeout>;
   clearTimeout(id: ReturnType<typeof setTimeout>): boolean;
   delay(ms: number, signal?: AbortSignal): Promise<void>;
   flush(): void;
   awaitRemaining(): Promise<void>;
}

export default TimeoutManager;
