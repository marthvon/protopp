Prototype plus plus (ppp, an extra p for the girthiest npm package that exists)

Need Help with documentation

```typescript
declare global {
   /**
    * Returned by the let helper function when void functions successfully ran/called.
    * Used to differentiate between <...>.let<zsx>(...) [??, optional else statement executed when undefined is returned instead of VoidRan]
    * Generally, undefined is returned by let<zsx> when callback fails to execute
    */
   type VoidRan = { returns: undefined; };

   interface Object {
      /** create new Object with the following keys and their respective values passed on only */
      copyOnly(...only: string[]): any;
      /** remove the following keys and their respective values. Note: IN-PLACE */
      removeKey(...except: string[]): object;
      flatIt(depth:number=1) : object;
      /**
       * Merges objects. Values that are typeof object are passsed as reference. Note: IN-PLACE
       */
      deepMerge(...sources: object[]): object; 
      /** 
       * structuredClone() is supported in modern browsers and Node.js 17+.
       * Default to structuredClone for supported plaforms but uses JSON serialization/deserialization for older versions. 
       * Non structuredClone variant will not accurately copy classes, regardles both cannot properly handle functions
       */
      deepCopy() : this;
      /**
       * Same as deepCopy but allows functions and classes to be copied through reference.
       * Also, custom classes with copyIt() hook methods can be copied
       */
      deepCopyP() : this;
      /** Compare two 'object' types based on their deserialized string value. Doesn't work with function and classes */
      isEquals(other : object) : boolean;
      /** 
       * Compare two 'object' types with precision used for numbers preventin false negative due to floating point errors. 
       * Allows comparison of function and classees. 
       * Classes are first compared by reference then when evaluated as false, they find, call, and compare toJSON() string value
       */
      isEqualsP(other : object) : boolean;
      /** Reverse key and value of an Object or Array. Note: NOT IN-PLACE */
      flipIt() : object;
      /** Reverse key and value of an Object or Array to a new Map. Note: NOT IN-PLACE */
      flipItP<K,V>() : Map<V,K>;
      /** create array or append to array value found in the value of key */
      appendInsert(key: string, ...value:[])
      /** Set value for deeply nested Object with several keys */
      deepSet(value:any, ...keys:Array<string|number>);
      /** Execute callback if value is not null or undefined. Just like <...>?.let{ <...> } in Kotlin
      * @param it - is this/self/calling instance
      */
      letz: {
         <T, R>(run: (it : T)=>R) : R;
         <T>(run: (it : T)=>void) : VoidRan;
      };
      /** 
       * Execute callback if value is not null or undefined given instance is not a falsy value. . Just like <...>?.let{ <...> } in Kotlin
       * @param it - is this/self/calling instance
       */
      lets : {
         <T, R>(run: (it : T)=>R) : R|undefined;
         <T>(run: (it : T)=>void) : VoidRan|undefined;
      };
      /** 
       * Execute callback if value is not null or undefined given instance fulfills condition.
       * example in Rust: if let MyClass(x) { ...do something with x }; with letx you can:
       *    <...>.letx((it) => it instanceof MyClass, (it) => ...) [??, optional to add else statement];
       * @param it - is this/self/calling instance
       */      
      letx : {
         <T, R>(condition: (it: T)=>boolean, run: (it : T)=>R) : R|undefined;
         <T>(condition: (it: T)=>boolean, run: (it : T)=>void) : VoidRan|undefined;
      };
   }
   interface String {
      sanitizeRegex() : string;
      sanitizeHtml() : string;
      /** returns character found in specified index, or default index 0, added by corresponding value based on it's ordinal value */
      charAdd(value:number, index:number=0) : string;
      /** does what trim does but can specify character type used instead of default whitespace */
      trimIt(char:string): string;
      indexOfOccurIn(searchString:string, occuring:number) : number
      indexOfAll(searchString:string) : number[];
      snakeToTitleCase() : string;
      slugToTitleCase() : string;
      titleToSnakeCase() : string;
      titleToSlug() : string;
   }

   interface Number {
      /** safe from floating point errors. Epsilon can be specified */
      greaterThan(other:number, epsilon:number=0.000001) : boolean;
      /** safe from floating point errors. Epsilon can be specified */
      lessThan(other:number, epsilon:number=0.000001) : boolean;
      /** safe from floating point errors. Epsilon can be specified */
      isEquals(other:number, epsilon:number=0.000001) : boolean;
      /** safe from floating point errors. Epsilon can be specified */
      atLeast(other:number, epsilon:number=0.000001) : boolean;
      /** safe from floating point errors. Epsilon can be specified */
      atMost(other:number, epsilon:number=0.000001) : boolean;
      /** approximates numbers with trailing zeros or nines, like 1.1000... or 5.999.... */
      approximate(significance:number=3) : number;
   }

   interface Math {
      /** Precise  */
      floorP(number:number) : number;
      /** Precise  */
      fractP(number:number) : number;
      /** Using built-in js Math.floor to find fract */
      fract(number:number) : number;
   }
   
   /** 
    * Helper function ideally called to execute one time functions.
    * See this: (()=>1+1)() is hard to read but basically same as doing runIt(()=>1+1)
    * Why? Because I lyke Da wey Kotln n Rust does it. 
    * Note: creating anonymous callbacks inside function have additional cost
    */
   function runIt<T>(lambda : ()=>T) : T;
   /** compress list of boolean to a number (represented as a flag) */
   function truthTable(...clauses: boolean[]) : number;
   /** Legacy Js before 2020 has no ?? operator */
   function nullCoalesce<T1,T2>(value:T1, Or:T2|(()=>T2)) : T1|T2;
   function lineNoHere() : number;
   function isClass(obj:any) : boolean;
   function isCustomClass(obj:any) : boolean;

   /* add later
      ValidateRule, FetchExtra
      class SafeTimeout, catchTimeout.<create|cleanup>, passSafeTimeout, safeSetTimeout,
      class ObjectiveRecursion (create shared object ref during recursion)
      actualMatch, same as oneTime reimplementation (Map.get(function reference, line number) || Map.set(function reference, line number, fn cllbk)()
      babel macro or some shit to make it readable but, if you're technically using macros, there might be better ways of doing. codegen is pretty dangerous area to jump in
   */

   interface Array<T> {
      /** Use ES6 Sets to combine arrays with only unique values. Object type doesn't perform deep comparison (compare by reference). Note: NOT IN-PLACE */
      combineUniquely(...arrs: Array<T>[]) : Array<T>;
      /** Creates a copy of array without the listed index. Note: NOT IN-PLACE */
      removeIndex(...indexes: number[]) : Array<T>;
      /** 
       * Creates a copy of array without the listed value or satisfying the following condition. 
       * Note: NOT IN-PLACE 
       */
      removeValue(value:T|((value:T)=>boolean), times:number=-1) : Array<T>;
      /** for js versions that doesn't support Array.flat. Note: NOT IN-PLACE */
      legacyFlat(depth:number=1) : Array<T>;
      /**
       * Doesn't work when return value of callback is function/classes/object/array
       */
      groupItBy(through: (val:T)=>T) : object;
      /**
       * Doesn't work when array has an element that is function/classes/object/array
       */
      countItBy() : object;
      /** 
       * Precisely maintains insertion order. 
       * And, allows objects, classes and function references as keys 
       */
      countItByP() : Map<T, number>;
      /** 
       * Precisely maintains insertion order. 
       * And, allows objects, classes and function references as keys 
       */
      groupItByP<R>(through: (val:T)=>R) : Map<R, T>;
      paginateIt(pageSize : number) : Array<Array<T>>;
      evenlySplit(split:number, remainderAtEnd:boolean=true) : Array<Array<T>>;
   }

   /**
    * No actual strict enforcement.
    * Use to notify that the array is expected to be sorted at this point
    */
   interface SortedArray<T> extends Array<T> {
      sortedInsert(value:T|((other:T)=>number));
      searchSorted(value:T|((other:T)=>number)) : number;
   }

   interface ZipItState {
      index: number; // number of iterations
      endCount: number; // number of zip arrays that already ended
      endTruths: number // bit flag of array that finished are set to 1
   }

   class ZipIteratorHandler<T> {
      values : ArrayIterator<T>[];
      constructor(values: ArrayIterator<T>[]);
      forEach : (state:{cond?:((state:ZipItState)=>boolean), d0: (values:Array<T>, state:ZipItState)=>boolean|undefined})=>void;
      reduce : <R>(state:{cond?:((state:ZipItState)=>boolean), d0: (res:R, values:Array<T>, state:ZipItState)=>R}, intialValue?:R)=>R;
      map : <R>(state:{cond?:((state:ZipItState)=>boolean), d0: (values:Array<T>, state:ZipItState)=>R})=>Array<R>;
   }

   interface ArrayConstructor {
      /** justZip does whatevery other zip function does */
      justZip<T>(...arrs: Array<any>[]) : Array<T>;
      /** 
       * does what a zip function does until a certain specified condition is met
       */
      zipIt<T>(until: number|((state:ZipItState)=>boolean), ...arrs: Array<any>[]) : Array<T>;
      /**
       * @returns ZipIteratorHandler - can do returnValue.values() to get an array of ArrayIterator
       *    Or, returnValue.forEach(...) to do the spicy stuff. 
       *    cond callback can be specified but generally unnecessary (optional).
       *    Since, as long as d0 callback doesn't return false, then loop continues (meaning conditional logic can be added to d0).
       *    Also, returning nothing in d0 would also keep the loop running. Soley depends on what syntactic sugar u like.
       *    ZipIteratorHandler has a single use before this.values are rendered unusable
       */
      zipItr<T>(...arrs: Array<any>[]) : ZipIteratorHandler<T>;
      /** 
       * Used to wrap around Array.searchSorted result. 
       * Normally, Array.searchSorted returns a negative number,
       * when it doesn't find an exact match of the provided value. 
       * This wrapper sets the return index to the closest index + 1 to the provided value
       * and the value that exists in the array. 
       */
      closestIndex(index:number) : number;
   }

   interface Function {
      /** Only called through function(...) {...}, also function cannot be async */
      stateful<T extends Object>(state:T, root?: Function) : this;
      debounce(delta:number): this;
      throttle(delta:number): this;
   }

   interface FunctionConstructor {
      isAsync(func) : boolean;
   }

   /**
    * Use type PureFunction to mark that function shouldn't have any outside references, 
    * aside from passed arguments and perhaps some global variables.
    * No actual strict enforcement,
    * but is generally used to inform developers to not use any variables outside of function's local scope 
    */
   interface PureFunction extends Function {
      memoize(): this
      memoizeFifo(allocLimit:number, onDealloc?:<R>(value:R)=>void): this;
      memoizeLru(allocLimit:number, onDealloc?:<R>(value:R)=>void): this;
      memoizeLfu(allocLimit:number, onDealloc?:<R>(value:R)=>void): this;
   }

   //interface JSON {
   //   /**
   //    * not implemented yet.
   //    * Not sure how to go about it but 
   //    * could introduce security issues if not handled correctly
   //    */
   //   parseExtra();
   //   addFactoryResource();
   //}

   interface Error {
      suppressedThrow(err:Error);
      safeCatch(callback: Function);
   }

   class SuppressedError extends Error {
      private errorStack : Array<Error>;
      constructor(...errors: Error[]);
      suppressed(err:Error) : this;
      suppressedThrow(err:Error);
      handleTop(): Error;
      topRecovered() : this;
      isHandled() : boolean;
      throw();
      forEach(d0);
      map<T>(d0) : Array<T>;
   }
}
```