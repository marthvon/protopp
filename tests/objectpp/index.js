import '../../src/objectpp/index.js';
import '../../src/numberpp/methods/precisionpp.js';

const map = new Map();
const objA = {};
const objB = {"keyA":1,"keyB":2,"keyC":3};
const objC = {"a":1,"b":2,"c":true};
const objD = {"a":1,"b":2,"c":true};
const objE = {"a":0.3,"b":"2","c":true,"false":{"arr":objA},"obj":map};
const objF = {"a":(0.2+0.1),"b":"2","c":true,"false":{"arr":objA},"obj":map};
const objG = {"a":0.3,"b":"2","c":true};
const objH = {"a":(0.2+0.1),"b":"2","c":true};
const objI = {d:3,false:{arr:1},b:5};

console.log([
   'Testing appendInsert => ' + (()=>{
      objA.appendInsert('a', 1);
      objA.appendInsert('a', 2);
      return JSON.stringify(objA);
   })() + ' [Expected: a:[1,2]]',
   'Testing copyOnly => ' + JSON.stringify(objB.copyOnly('keyA', 'keyB'))  + ' [Expected: keyA:1,keyB:2]',
   'Testing removeKey => ' + JSON.stringify(objB.removeKey('keyA', 'keyB'))  + ' [Expected: keyC:3]',
   'Testing removeKey => ' + JSON.stringify(objC.flipIt())  + ' [Expected: 1:a,2:b,true:c]',
   'Testing objEquals => ' + objC.isEquals(objD)  + ' [Expected: true]',
   'Testing objEqualsP => ' + objE.isEqualsP(objF)  + ' [Expected: true]',
   'Testing objEqualsP => ' + objG.isEqualsP(objH)  + ' [Expected: true]',
   'Testing flatIt => ' + JSON.stringify(objE.flatIt()) + ' [Expected: "a":0.3,"b":"2","c":true,"arr":objA,"obj":map]',
   'Testing flatIt => ' + JSON.stringify(objE.flatIt(2)) + ' [Expected: "a":[1,2],"b":"2","c":true,"obj":map]',
   'Testing flatIt => ' + JSON.stringify(objE.flatIt(-1)) + ' [Expected: "a":[1,2],"b":"2","c":true,"obj":map]',
   'Testing deepMerge => ' + JSON.stringify(objE.deepMerge(objI)) + ' [Expected: {"a":0.3,"b":5,"c":true,"false":{"arr":1},"obj":{},"d":3}]',
   'Testing deepCopy => ' + JSON.stringify(objE.deepCopy()) + ' [Expected: ]',
   'Testing deepCopyP => ' + (objE.deepCopy()["obj"] === map) + ' [Expected: false]',
   'Testing deepCopyP => ' + (objE.deepCopyP()["obj"] === map) + ' [Expected: true]',
].join("\n"));