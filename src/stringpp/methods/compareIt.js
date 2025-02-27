import '../../utilitypp/def/truthTable.js';
import '../../utilitypp/def/matchOrdering.js';
import './isCharTypeof.js';

const strCompFlags = {
   i: 0b00000001,
   l: 0b00000010,
   a: 0b11100100,
   m: 0b01101100,
   o: 0b01111000,
   f: 0b11011000,
   t: 0b10011100,
   d: 0b10110100
}

/*
const GET_ALPHA = 0b11000000;
const GET_NUMBERS = 0b00110000;
const GET_SYMBOLS = 0b00001100;
*/
function __compareIt(bitFlag, self, other) {
   for(let i = 0; i < self.length; ++i) {
      if(other.length === i)
         return bitFlag & strCompFlags.l? -1 : 1;
      switch(truthTable(self.isCharAscii(i), other.isCharAscii(i))) {
         case 0b11:
            const thisType = truthTable(self.isCharAlpha(i), self.isCharNumber(i));
            const otherType = truthTable(other.isCharAlpha(i), other.isCharNumber(i));
            if(thisType !== otherType) 
               return ((bitFlag >> ((thisType + 1)*2)) & 0b11) > ((bitFlag >> ((otherType + 1)*2)) & 0b11)? -1 : 1;
         case 0b00:
            const temp = matchOrdering(self.charCodeAt(i), other.charCodeAt(i));
            if(temp)
               return temp;
            continue;
         case 0b01: return 1;
         case 0b10: return -1;
      }
   }
   if(self.length < other.length)
      return bitFlag & strCompFlags.l? 1 : -1;
   return 0;
}

function __parseFlags(flags) {
   if(flags === undefined)
      return 0b11100100;
   if(typeof flags === 'number')
      return flags; 
   let bitFlag = 0;
   for(const c of flags) {
      const bit = strCompFlags[c]
      if(bit > 3 && bitFlag > 3)
         continue;
      bitFlag |= bit;
   }
   return bitFlag;
}

if(!String.prototype.compareIt) 
Object.defineProperty(String.prototype, 'compareIt', { value: function(other, flags) {
   const bitFlag = __parseFlags(flags);
   return bitFlag & strCompFlags.i? __compareIt(bitFlag, this.toUpperCase(), other.toUpperCase()) 
      : __compareIt(bitFlag, this, other);
}, writable:true});