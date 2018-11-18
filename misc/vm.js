/*
 * Example VM
 * Running some arbitrary commmands
 *
 */

// Dependencies
const vm = require('vm');

// Define a context for the script to run in
const context = {
  foo: 50
};

// Define the script
const script = new vm.Script(`
  foo = foo * 4;
  var bar = foo + 17;
  var fizz = 99;
  let buzz = fizz * 10;
  const fizbuzz = fizz + buzz
`);

// Run the script
script.runInNewContext(context);
console.log(context);
