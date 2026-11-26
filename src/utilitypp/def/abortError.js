export function abortError(signal) {
   if(signal?.reason !== undefined)
      return signal.reason;
   else if(typeof DOMException === 'function')
      return new DOMException('This operation was aborted', 'AbortError');
   const error = new Error('This operation was aborted');
   error.name = 'AbortError';
   return error;
}
