/*
 * Example REPL server
 * Take in the word "ping" and log out "pong"
 *
 */

// Dependencies
const repl = require('repl');

// Start the REPL
repl.start({
  prompt: '>',
  eval: (str) => {
    // Evaluation function for incoming inputs
    console.log("At the evaluation stage:", str);

    // If the user said 'ping', say 'pong' back to them
    if (str.indexOf('ping') > -1){
      console.log(`You said ${str.trim()}, I say pong`);
    }
  },
});
