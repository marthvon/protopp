import TimeoutManager from "../classpp/TimeoutManager.d.ts";
import FetchManager from "../classpp/FetchManager.d.ts";

type FetchExtraParams<T, FetchResponse, CacheResponse> = {
   fetchMethod?:(...args)=>Promise<FetchResponse>, defaultUrl:string, getter:()=>T,
   cacher?:(()=>T)|(()=>Promise<T>), retry ?: number, retryDelay ?: number, 
   errorCallback?: string|((err:Error, tries:number, isFetcher:boolean)=>void),
   timeoutManager?: TimeoutManager, fetchManager?: FetchManager
} | {
   setter:(value:undefined|null|T|FetchResponse|CacheResponse)=>T
} | {
   setter:(value:undefined|null|T|CacheResponse)=>T,
   cleanFetcher:(response:FetchResponse)=>T
} | {
   setter:(value:undefined|null|T|FetchResponse)=>T,
   cleanCacher:(response:CacheResponse)=>T
} | {
   setter:(value:undefined|null|T)=>T,
   cleanFetcher:(response:FetchResponse)=>T,
   cleanCacher:(response:CacheResponse)=>T
};

export function fetchExtra<T, FetchResponse, CacheResponse>({
   fetchMethod=fetch, defaultUrl, 
   getter, setter, cacher, 
   retry, retryDelay, errorCallback,
   timeoutManager, fetchManager, 
   cleanFetcher, cleanCacher
} : FetchExtraParams<T, FetchResponse, CacheResponse>) 
   : 
({ url, config } : { url?:string, config?:object }, ...args) => T|Promise<T>;