if(!Math.floorP)
Object.defineProperty(Math, 'floorP', { value: function(number) {
   return JSON.parse(JSON.stringify(number).replace(/\.\d*/, ''));
}, writable:true});

if(!Math.fract)
Object.defineProperty(Math, 'fract', { value: function(number) {
   return number - Math.floor(number);
}, writable:true});

if(!Math.fractP)
Object.defineProperty(Math, 'fractP', { value: function(number) {
   return JSON.parse(JSON.stringify(number).replace(/\d*\./, '0.'));
}, writable:true});