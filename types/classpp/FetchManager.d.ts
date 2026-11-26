export class FetchManager {
   create(): FetchManager;
   destroy(manager: FetchManager): boolean;
   abortion(reason?: unknown): void;
   propagateAbortion(reason?: unknown): void;
   getSignal(): AbortSignal;
}

export default FetchManager;
