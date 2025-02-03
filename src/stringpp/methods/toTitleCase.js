function toTitleCase(str, separator) {
   return str.replaceAll(separator, ' ')
      .replace(/\b\w/g, match => match.toUpperCase())
      .replace(/\b[A-Z]\s(?![A-Z][a-z])/g, match => match.charAt(0));
}

if(!String.prototype.snakeToTitleCase)
Object.defineProperty(String.prototype, 'snakeToTitleCase', { value: function() {
   return toTitleCase(this, '_')
}, writable:true});

if(!String.prototype.slugToTitleCase)
Object.defineProperty(String.prototype, 'slugToTitleCase', { value: function() {
   return toTitleCase(this, '-')
}, writable:true});