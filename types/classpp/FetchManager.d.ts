export default class FetchManager {
   create() : FetchManager;
   destroy(manager: FetchManager);
   abortion();
   propagateAbortion();
   getSignal() : AbortSignal;
}