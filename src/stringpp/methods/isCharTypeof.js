function isCodeNumber(code) {
   return 47 < code && code < 58;
}

function isCodeAlpha(code) {
   return (64 < code && code < 91) || (96 < code && code < 123);
}

if(!String.prototype.isCharNumber) 
Object.defineProperty(String.prototype, 'isCharNumber', { value: function(at=0) {
   return isCodeNumber(this.charCodeAt(at));
}, writable:true});

if(!String.prototype.isCharSymbol) 
Object.defineProperty(String.prototype, 'isCharSymbol', { value: function(at=0) {
   const code = this.charCodeAt(at);
   return code < 128 && !(isCodeNumber(code) || isCodeAlpha(code));
}, writable:true});

if(!String.prototype.isCharAlpha) 
Object.defineProperty(String.prototype, 'isCharAlpha', { value: function(at=0) {
   return isCodeAlpha(this.charCodeAt(at));
}, writable:true});

if(!String.prototype.isCharAscii) 
Object.defineProperty(String.prototype, 'isCharAscii', { value: function(at=0) {
   return this.charCodeAt(at) < 128
}, writable:true});