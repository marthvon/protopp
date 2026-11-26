import type TimeoutManager from "../classpp/TimeoutManager.js";
import type FetchManager from "../classpp/FetchManager.js";

export type FetchSlug = string | number | ReadonlyArray<string | number>;

export type FetchSource = "pending" | "cache" | "fetch";

export type FetchConfig = RequestInit & Record<string, any>;

export interface FetchCall {
   url?: string | URL;
   slug?: FetchSlug;
   method?: string;
   config?: FetchConfig;
   force?: boolean;
}

export interface FetchRequest {
   url: string;
   slug: FetchSlug | undefined;
   method: string;
   config: FetchConfig;
   key: string;
   dedupable: boolean;
}

export interface FetchCacher<C> {
   get(key: string): C | undefined | Promise<C | undefined>;
   set(key: string, value: any): unknown;
}

export interface FetchExtraOptions<T, R = Response, C = T> {
   fetchMethod?: (url: string, init: FetchConfig, ...args: any[]) => R | Promise<R>;
   defaultUrl?: string | URL;
   getter?: (request: FetchRequest) => T | Promise<T> | undefined;
   setter?: (value: T | Promise<T>, request: FetchRequest, source: FetchSource) => void;
   cacher?: ((request: FetchRequest) => C | undefined | Promise<C | undefined>) | FetchCacher<C>;
   cleanFetcher?: (response: R, request: FetchRequest) => T | Promise<T>;
   cleanCacher?: (cached: C, request: FetchRequest) => T | Promise<T>;
   retry?: number;
   retryDelay?: number | ((tries: number, error: any) => number);
   errorCallback?: string | ((error: any, tries: number, isFetcher: boolean) => void);
   timeoutManager?: TimeoutManager;
   fetchManager?: FetchManager;
   waitFor?: (request: FetchRequest) => unknown;
   dedupe?: boolean;
}

export class FetchExtra<T = any, R = Response, C = T> {
   constructor(options?: FetchExtraOptions<T, R, C>);
   fetch(call?: FetchCall, ...args: any[]): T | Promise<T>;
   pending(): Promise<void> | undefined;
}

export class FetchError<R = Response> extends Error {
   constructor(response: R & { status: number; statusText?: string });
   readonly status: number;
   readonly response: R;
}

export function fetchExtra<T = any, R = Response, C = T>(options?: FetchExtraOptions<T, R, C>): FetchExtra<T, R, C>;
