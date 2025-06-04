# Prototype plus plus 
*(ppp.js, an extra p for the girthiest npm package that exists)*

* Utility package that extends the functionality of JS native types.
* Write maintainable and readable code within fewer lines than it would normally take.
* Ease of use in performing functionalities not native to JS at your convenience.
* Utilize language features you love from other language like Go, Rust or Kotlin.
* Code how you want with the freedom to choose the paradigm you like.

## How to get started?

``` bash 
npm install @marthvon/protopp 
```
``` javascript 
import '@marthvon/protopp'; 
```
 - will setup all additional prototype methods defined in global namespace

Optionally, only setup the method you require in the project like so: <br>
``` javascript 
import '@marthvon/protopp/objectpp/methods/copyOnly.js'; 
```
Now, you can call the prototype extension methods, like copyOnly method on an object like so: <br>
``` javascript 
{a:1,b:2,c:3}.copyOnly('a', 'c'); 
```

Learn more: https://marthvon-solution.tech/docs/protopp
Liscence Updated: 04/06/2024
