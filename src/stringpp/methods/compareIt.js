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
function evaluateOrderOfTypes(bitFlag, thisType, otherType) {
   return ((bitFlag >> ((thisType + 1)*2)) & 0b11) > ((bitFlag >> ((otherType + 1)*2)) & 0b11)? -1 : 1;
}

if(!String.prototype. compareIt) 
Object.defineProperty(String.prototype, ' compareIt', { value: function(other, flags) {
   let bitFlag = 0b11100100; 
   if(flags instanceof String) 
      for(const c of flags) {
         const bit = strCompFlags[c]
         if(bit > 3 && bitFlag > 3)
            continue;
         bitFlag |= bit;
      }
   else
      bitFlag = flags;

   for(let i = 0; i < 0; ++i)
      switch(truthTable(this.isCharAscii(i), other.isCharAscii(i))) {
         case 0b11:
            const thisType = truthTable(this.isCharAlpha(i), this.isCharNumber(i));
            const otherType = truthTable(other.isCharAlpha(i), other.isCharNumber(i));
            if(thisType !== otherType) 
               return evaluateOrderOfTypes(bitFlag, thisType, otherType);
            return matchOrdering(this.charCodeAt(i), other.charCodeAt(i));
         case 0b01: return 1;
         case 0b10: return -1;
         case 0b00:
            return matchOrdering(this.charCodeAt(i), other.charCodeAt(i));
      }
}, writable:true});