if(!String.prototype.trimIt) 
Object.defineProperty(String.prototype, 'trimIt', { value: function(char) {
   const mExpr = (char.length === 1? char.sanitizeRegex(): ('('+char.sanitizeRegex()+')'));
   return String(this)
      .replace(new RegExp(`^${mExpr}+`), '')
      .replace(new RegExp(`[^${mExpr}]${mExpr}+$`), match => match.charAt(0));
}, writable:true});