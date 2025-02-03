const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

if(!Function.isAsync) 
Object.defineProperty(Function, 'isAsync', { value: function(func) {
   return func && func.constructor === AsyncFunction;
}, writable:true});