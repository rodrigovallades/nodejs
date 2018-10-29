/*
 * Primary file for the API
 *
 * node inspect index-debug.js
 * cont / next / in / out / pause
 * repl to access variables
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');
const exampleDebuggingProblen = require('./lib/exampleDebuggingProblem');

// Declare the app
var app = {};

// Init function
app.init = () => {
  debugger;
  // Start the server
  server.init();
  debugger;

  // Start the workers
  debugger;
  workers.init();
  debugger;

  // Start the CLI, but make sure it starts last
  debugger;
  setTimeout(() => {
    cli.init();
  }, 50);
  debugger;

  debugger;
  let foo = 1;
  console.log('Just assigned 1 to foo');

  foo++;
  console.log('Just incremented foo');
  debugger;

  foo = foo.toString();
  console.log('Just converted foo to string');
  debugger;

  foo = foo * foo;
  console.log('Just converted foo to string');
  debugger;

  // Call the init script that will throw
  exampleDebuggingProblem.init();
  console.log('Just called the library');

  debugger;
};

// Execute
app.init();

// Export the app
module.exports = app;
