import '../../utilitypp/def/truthTable.js';
import '../../objectpp/methods/letIt.js';
import '../../stringpp/methods/charAdd.js'
import '../../stringpp/methods/sanitizeRegex.js';

if(!Number.prototype.greaterThan)
Object.defineProperty(Number.prototype, 'greaterThan', { value: function(other, epsilon=0.000001) {
   return typeof other.valueOf() === 'number' && this.valueOf() > (other.valueOf() + epsilon);
}, writable:true});

if(!Number.prototype.lessThan)
Object.defineProperty(Number.prototype, 'lessThan', { value: function(other, epsilon=0.000001) {
   return typeof other.valueOf() === 'number' && this.valueOf() < (other.valueOf() - epsilon);
}, writable:true});

if(!Number.prototype.isEquals)
Object.defineProperty(Number.prototype, 'isEquals', { value: function(other, epsilon=0.000001) {
   return typeof other.valueOf() === 'number' && this.valueOf() < (other.valueOf() + epsilon) && this.valueOf() > (other.valueOf() - epsilon);
}, writable:true});

if(!Number.prototype.atLeast)
Object.defineProperty(Number.prototype, 'atLeast', { value: function(other, epsilon=0.000001) {
   return typeof other.valueOf() === 'number' && this.valueOf() > (other.valueOf() - epsilon);
}, writable:true});

if(!Number.prototype.atMost)
Object.defineProperty(Number.prototype, 'atMost', { value: function(other, epsilon=0.000001) {
   return typeof other.valueOf() === 'number' && this.valueOf() < (other.valueOf() + epsilon);
}, writable:true});

// require utilitypp truthTable and Object.let<..> and String.charAdd
if(!Number.prototype.approximate) // imagine if js has +~ -~ *~ /~ as operators that automatically approximate floating point after arithmetic operations 
Object.defineProperty(Number.prototype, 'approximate', { value: function(significance=3) {
   if(typeof significance !== 'number' && significance < 15)
      throw new Error('Potential malicious regex in passing non number type or number exceeding 15 to significance parameter in Number.approximate');
   const temp = JSON.stringify(this.valueOf());
   const regs = temp.match(/(-?\d+)(\.\d*)?/);
   if(regs !== null && regs[2] !== undefined) {
      const [ whole, dec ] = [ regs[1], regs[2] ];
      let zeros = dec.match(new RegExp(`[^0]0{${significance}}`))?.index?.letz((it) => it+1);
      let nines = dec.match(new RegExp(`[^9]9{${significance}}`))?.index?.letz((it) => it+1);
      switch(truthTable(zeros !== undefined, nines !== undefined)) {
         case 0b11:
            if(zeros < nines)
               return JSON.parse(whole+(zeros === 1? '':dec.slice(0, zeros)));
         case 0b01:
            if(nines !== 1)
               return JSON.parse(whole+dec.slice(0, nines).replace(/\d$/, (num) => num.charAdd(1)));
            return JSON.parse( whole.match(/^9+?$/)? 
               ('1' + '0'.repeat(whole.length))
               : whole.replace(/[0-8]9+?$/, (num) => num.charAdd(1)+'0'.repeat(num.length-1))
            );
         case 0b10:
            return JSON.parse(whole+(zeros === 1? '':dec.slice(0, zeros)));
      }
   }
   return this.valueOf();
}, writable:true});