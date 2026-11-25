function floorPrinted(number) {
   if(!Number.isFinite(number))
      return number;
   const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(JSON.stringify(number));
   if(!match)
      return Math.floor(number);
   const sign = match[1] === '-' ? -1 : 1;
   const digits = match[2] + (match[3] ?? '');
   const exp = (match[4] !== undefined ? Number(match[4]) : 0) + match[2].length;
   if(digits.length <= exp)
      return sign * Number(digits + '0'.repeat(exp - digits.length));
   const whole = exp <= 0 ? 0 : Number(digits.slice(0, exp));
   const frac = exp <= 0 ? digits : digits.slice(exp);
   if(sign < 0 && /[1-9]/.test(frac))
      return -(whole + 1);
   else
      return sign * whole;
}

if(!Math.floorP)
Object.defineProperty(Math, 'floorP', { value: function(number) {
   return floorPrinted(number);
}, writable:true});

if(!Math.fract)
Object.defineProperty(Math, 'fract', { value: function(number) {
   return number - Math.floor(number);
}, writable:true});

if(!Math.fractP)
Object.defineProperty(Math, 'fractP', { value: function(number) {
   return number - Math.floorP(number);
}, writable:true});