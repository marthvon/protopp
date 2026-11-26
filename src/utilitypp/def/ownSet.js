// Local binding: scripts/generate.js treats Object.defineProperty as a prototype install.
const defineOwn = Object.defineProperty;

export function isPrototypeObject(value) {
   return value != null && typeof value === 'object' && value.constructor instanceof Function && value.constructor.prototype === value;
}

export function ownSet(target, key, value) {
   const property = typeof key === 'symbol'? key : String(key);
   if(property === '__proto__')
      defineOwn(target, property, { value, writable: true, enumerable: true, configurable: true });
   else
      target[property] = value;
   return value;
}
