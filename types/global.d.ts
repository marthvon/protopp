declare global {
   /**
    * Returned by the let helper function when void functions successfully ran/called.
    * Used to differentiate between <...>.let<zsx>(...) [??, optional else statement executed when undefined is returned instead of VoidRan]
    * Generally, undefined is returned by let<zsx> when callback fails to execute
    */
   type VoidRan = { returns: undefined; }; // should be class or object?

   interface Object {
      /** create new Object with the following keys and their respective values passed on only */
      copyOnly(...only: string[]): any;
      /** remove the following keys and their respective values. Note: IN-PLACE */
      removeKey(...except: string[]): object;
      flatIt(depth:number=1) : object;
      /**
       * Goes ballsdeep to Merge objects. Values that are typeof object are passsed as reference. Note: IN-PLACE
       */
      deepMerge(...sources: object[]): object; 
      /** 
       * structuredClone() is supported in modern browsers and Node.js 17+.
       * Default to structuredClone for supported plaforms but uses JSON serialization/deserialization for older versions. 
       * Non structuredClone variant will not accurately copy classes, regardles both cannot properly handle functions
       */
      deepCopy() : this;
      /**
       * Same as deepCopy but going ballsdeep to allow functions and classes to be copied through reference.
       * Also, custom classes with copyIt() hook methods can be copied
       */
      deepCopyP() : this;
      // contemplate copyOnWrite() : this
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
      /** Set value in ballsdeeply nested Object with several keys */
      deepSet(keys:(string|number)[], value:any);
      /** 
       * Set value in ballsdeeply nested Object with several keys.
       * Creates object in key if key doesn't exist yet 
       */
      deepSetP(keys:(string|number)[], value:any) : any;
      /** Go ballsdeep and retrieve a value using keys from a chain of objects */
      deepGet(...keys:(string|number)[]) : any;
      /**
       * Go ballsdeep and retrieve a value using keys from a chain of objects.
       * Otherwise, returns undefined when object doesn't exist
       */
      deepGetP(...keys:(string|number)[]) : any|undefined; // consider adding deepDelete
      /**
       * Provide a rules object which contains simillar keys as this object.
       * Wherein, the rules values are functions that validate the fields of this object.
       * The callback functions returns nothing or undefined or null when field is valid and returns anything else when it's not.
       * The return values are recorded in the return value wherein:
       * @returns [ list of messages for invalid fielsd, validated cleaned data ]
       */
      validateIt : {
         <R=this, K extends string>(rules: {[key in K]: (value:any)=>string|undefined}): [{[key in K]: string|undefined}, R];
         <R=this, K extends string>(rules: {[key in K]: (value:any)=>string|undefined}, ...only: K[]): [{[key in K]: string|undefined}, R];
         <K extends string>(rules: {[key in K]: (value:any)=>string|undefined}, only: K): string|undefined;
      };
      /**
       * Intended to cast fields in an object given a matching key. Note: IN-PLACE
       */
      castParseIt(parser: {[key:string]: (value:any)=>any}): this;
      /**
       * Detaches child list but preserves referential integrity to parent object through the given parameters. Note: IN-PLACE
       * @param references - list of strings are retrieve from child[string] = this[string].
       *    Or an object is passed and unwrapped to [ key, value ], child[value] = this[key].
       *    Hence, references can contain argument of { keyOnParent: renameKeyOnChild }
       */
      detachIt(child_field:string, ...references: (string|{[key:string]:string})[]): object;
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
      /**
       * Handles sorting basic ASCII and characters beyond the first 255 are sorted based on their charCode.
       * Otherwise, flags exist like:
       *    (i) case insensitive                - 0bXXXXXXX1
       *    (l) longest length first.           - 0bXXXXXX1X
       *    exclusive options:
       *       (a) alpha < numbers < symbols    - 0b111001XX
       *       (m) symbols < numbers < alpha    - 0b011011XX
       *       (o) numbers < symbols < alpha    - 0b011110XX 
       *       (f) alpha < symbols < numbers    - 0b110110XX
       *       (t) symbols < alpha < numbers    - 0b100111XX
       *       (d) numbers < alpha < symbols    - 0b101101XX
       * Can, also just enter bitflag directly
       */
      compareIt(other:string, flags?:string) : number; //have I tested this?
      /** only works for ascii */
      isCharNumber(at:number=0) : boolean;
      /** only works for ascii */
      isCharSymbol(at:number=0) : boolean;
      /** only works for ascii */
      isCharAlpha(at:number=0) : boolean;
      isCharAscii(at:number=0) : boolean;
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
   function matchOrdering<T>(a: T, b: T): number;
   function matchOrderingP<T>(a: T, b: T): number;

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

   interface FunctionConstructor {
      isAsync(func) : boolean;
   }

   /**
    * Function interface and PureFunction interface add utilities that other languages calls as wrappers.
    */
   interface Function {
      /** 
       * Only called through function(...) {...}, also function cannot be async.
       * LOWER-ORDER FUNCTION -
       *    are functions that are use to modify functions and must be chained at the end.
       *    ex: myFunction().throttle(...).stateful();
       *    Must also be created using the function() {} syntax, otherwise doesn't work with ()=>{}
       * Mostly persist variables in the this context for subsequent recursive calls to the function.
       * Syntactic sugar that lessen arguments in function and ensure declares <...>.stateful(state: {x:0}) persist in this.x;
       * Best use to store queues/stacks/(etc. data structures) on the state rather than primitives
       */
      stateful<T extends Object>(state:T, recurring?: Function) : this;
      /** 
       * LOWER-ORDER FUNCTION -
       *    are functions that are use to wrap the functions and must be chained at the end.
       *    ex: myFunction().debounce(...).deferrable();
       *    Must also be created using the function() {} syntax, otherwise doesn't work with ()=>{}
       * Assign this.defer Setter in function body allowing defer like syntax in Go
       *    ex: const timeoutManager = new TimeoutManager();
       *        this.defer = () => timeoutManager.flush()
       */
      deferrable(): this;
      debounce(delta:number): this;
      throttle(delta:number): this;
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
}

export {};