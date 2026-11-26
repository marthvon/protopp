export type FilterPattern = string | RegExp | ReadonlyArray<string | RegExp> | ((id: string) => boolean);

export interface ProtoppPluginOptions {
   include?: FilterPattern;
   exclude?: FilterPattern;
   dispatch?: "safe" | "trusted";
   unbound?: "error" | "warn";
   legacy?: boolean;
   devThrows?: boolean;
}

declare function protopp(options?: ProtoppPluginOptions): any;
export default protopp;
