export const globalContext = globalThis || window || global || null;
export function defineGlobalFunc(declaration, definition) {
   if(globalContext && !globalContext.hasOwnProperty(declaration))
      globalContext[declaration] = definition;
}