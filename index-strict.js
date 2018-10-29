/*
 * Primary file for the API
 * node --use_strict index-strict.js
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');

// Declare the app
var app = {};

// Declare a global that strict mode should catch
foo = 'bar';

// Init function
app.init = () => {
  // Start the server
  server.init();

  // Start the workers
  workers.init();

  // Start the CLI, but make sure it starts last
  setTimeout(() => {
    cli.init();
  }, 50);
};

// Execute
app.init();

// Export the app
module.exports = app;
