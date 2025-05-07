const VoidRan = Object.freeze({returns: undefined});
export function letVoid(value) {
   return value === undefined? VoidRan : value;
}