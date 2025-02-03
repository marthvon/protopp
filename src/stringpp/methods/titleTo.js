import './sanitizeRegex.js';

function titleTo(str, separator) {
   return str.replace(new RegExp(`[^\\w${separator.sanitizeRegex()}]`, 'g'), '')
      .replace(/([a-z0-9][A-Z])|([A-Z][A-Z](?=[a-z0-9]))|([a-z][0-9])/g, (match) => match.charAt(0)+separator+match.charAt(1))
      .toLowerCase();
}

if(!String.prototype.titleToSnakeCase)
Object.defineProperty(String.prototype, 'titleToSnakeCase', { value: function() {
   return titleTo(this, '_');
}, writable:true});

if(!String.prototype.titleToSlug)
   Object.defineProperty(String.prototype, 'titleToSlug', { value: function() {
      return titleTo(this, '-');
   }, writable:true});