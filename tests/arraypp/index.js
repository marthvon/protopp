import '../../src/arraypp/index.js';

const arrA = [1,2,3];
const arrB = [1,4,3];
const arrC = [1,3,6,8];
const arrD = [9,10,5,21,3];
const arrE = [1,1,3,1,5,1];
const arrF = [2,4,6];

console.log([
   'Testing combineUniquely => ' + arrA.combineUniquely(arrB) + ' [Expected: 1,2,3,4]',
   'Testing countItBy => ' + JSON.stringify([...arrA, ...arrB].countItBy()) + ' [Expected: {1:2,2:1,3:2,4:1}]',
   'Testing countItByP => ' + [...arrA, ...arrB].countItByP().get(1) + ' [Expected: 2]',
   'Testing paginateIt => ' + JSON.stringify(arrD.paginateIt(3)) + ' [Expected: [9,10,5],[21,3]]',
   'Testing evenlySplit => ' + JSON.stringify(arrC.evenlySplit(2)) + ' [Expected: [1,3],[6,8]]',
   'Testing evenlySplit => ' + JSON.stringify(arrD.evenlySplit(2)) + ' [Expected: [9,10],[5,21],[3]]',
   'Testing evenlySplit => ' + JSON.stringify(arrD.evenlySplit(2,false)) + ' [Expected: [9],[10,5],[21,3]]',
   'Testing groupItBy => ' + JSON.stringify(arrC.groupItBy((val) => val % 2)) + ' [Expected: {0:{6,8},1:{1,3}}]',
   'Testing groupItByP => ' + arrC.groupItByP((val) => val % 2).get(0) + ' [Expected: 6,8]',
   'Testing removeIndex => ' + arrD.removeIndex(0,3) + ' [Expected: 10,5,3]',
   'Testing removeValue => ' + arrE.removeValue(1) + ' [Expected: 3,5]',
   'Testing removeValue => ' + arrE.removeValue(1, 2) + ' [Expected: 3,1,5,1]',
   'Testing removeValue => ' + arrD.removeValue((val) => (val%5)===0) + ' [Expected: 9,21,3]',
   'Testing legacyFlat => ' + JSON.stringify([1,[2,[3]],[4,5]].legacyFlat()) + ' [Expected: 1,2,[3],4,5]',
   'Testing legacyFlat => ' + JSON.stringify([1,[2,[3]],[4,5]].legacyFlat(-1)) + ' [Expected: 1,2,3,4,5]',
   
   'Testing searchSorted => ' + arrF.searchSorted(1) + ' [Expected: -1]',
   'Testing searchSorted => ' + arrF.searchSorted(2) + ' [Expected: 0]',
   'Testing searchSorted => ' + arrF.searchSorted(3) + ' [Expected: -2]',
   'Testing searchSorted => ' + arrF.searchSorted(4) + ' [Expected: 1]',
   'Testing searchSorted => ' + arrF.searchSorted(5) + ' [Expected: -3]',
   'Testing searchSorted => ' + arrF.searchSorted(6) + ' [Expected: 2]',
   'Testing searchSorted => ' + arrF.searchSorted(7) + ' [Expected: -4]',

   'Testing searchSorted => ' + (() => { const arrs = [2,4,6]; arrs.sortedInsert(1); return arrs; })() + ' [Expected: 1,2,4,6]',
   'Testing searchSorted => ' + (() => { const arrs = [2,4,6]; arrs.sortedInsert(2); return arrs; })() + ' [Expected: 2,2,4,6]',
   'Testing searchSorted => ' + (() => { const arrs = [2,4,6]; arrs.sortedInsert(3); return arrs; })() + ' [Expected: 2,3,4,6]',
   'Testing searchSorted => ' + (() => { const arrs = [2,4,6]; arrs.sortedInsert(4); return arrs; })() + ' [Expected: 2,4,4,6]',
   'Testing searchSorted => ' + (() => { const arrs = [2,4,6]; arrs.sortedInsert(5); return arrs; })() + ' [Expected: 2,4,5,6]',
   'Testing searchSorted => ' + (() => { const arrs = [2,4,6]; arrs.sortedInsert(6); return arrs; })() + ' [Expected: 2,4,6,6]',
   'Testing searchSorted => ' + (() => { const arrs = [2,4,6]; arrs.sortedInsert(7); return arrs; })() + ' [Expected: 2,4,6,7]',

   'Testing justZip => ' + JSON.stringify(Array.justZip([1,2,3], [4,5,6,7])) + ' [Expected: [1,4],[2,5],[3,6],[null,7]]',
   'Testing justZip => ' + JSON.stringify(Array.zipIt(2, [1,2,3], [4,5,6,7])) + ' [Expected: [1,4],[2,5]]',
   'Testing justZip => ' + JSON.stringify(Array.zipIt(5, [1,2,3], [4,5,6,7])) + ' [Expected: [1,4],[2,5],[3,6],[null,7],[null,null]]',
   'Testing justZip => ' + JSON.stringify(Array.zipIt(({endCount}) => endCount === 0, [1,2,3], [4,5,6,7])) + ' [Expected: [1,4],[2,5],[3,6]]',
   'Testing justZip => ' + JSON.stringify(Array.zipIt(({endTruths}) => (endTruths & 0b10) === 0, [1], [4,5], [2,3,7])) + ' [Expected: [1,4,2],[null,5,3]]',
].join("\n"));

console.log("\nTesting zipItr => ");
Array.zipItr([1,2,3], [4,5,6,7]).forEach({d0: (values) => {
   console.log(values[0], " ", values[1]);
}});
console.log(" [Expected: [1,4],[2,5],[3,6],[undefined,7]]\n");

console.log("\nTesting zipItr => ");
Array.zipItr([1,2,3], [4,5,6,7]).forEach({cond: (state) => state.endCount === 0, 
   d0: (values) => {
      console.log(values[0], " ", values[1]);
   }
});
console.log(" [Expected: [1,4],[2,5],[3,6]]\n");

console.log([
   'Testing zipItr => ' + Array.zipItr([1], [4,5], [2,3,7]).reduce({
      cond: ({endTruths}) => (endTruths & 0b10) === 0,
      d0: (res, values) => res
            + (values[0]? values[0] : 0) 
            + (values[1]? values[1] : 0)*2
            + (values[2]? values[2] : 0)*3
   }, 0) + ' [Expected: 34]',
   'Testing zipItr => ' + Array.zipItr([1], [4,5], [2,3,7]).map({
      cond: ({endCount}) => endCount !== 2,
      d0: (values) => (values[0]? values[0] : 0) 
            + (values[1]? values[1] : 0)
            + (values[2]? values[2] : 0)
   }) + ' [Expected: 7,8]',
].join("\n"));