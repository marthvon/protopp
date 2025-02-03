import he from 'he';
if(!String.prototype.sanitizeHtml) 
Object.defineProperty(String.prototype, 'sanitizeHtml', { value: function() {
   /* doesn't work on node
   const div = document.createElement('div'); 
   div.textContent = this;
   return div.innerHTML;*/
   return he.encode(this);
}, writable:true});