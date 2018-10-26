/*
 * CLI-Related Tasks
 *
 */

// Dependencies
const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
class _events extends events{};
const e = new _events();

// Instantiate the CLI module object
const cli = {};

// Input handlers
e.on('man', (str) => {
  cli.responders.help();
});

e.on('help', (str) => {
  cli.responders.help();
});

e.on('exit', (str) => {
  cli.responders.exit();
});

e.on('stats', (str) => {
  cli.responders.stats();
});

e.on('list users', (str) => {
  cli.responders.listUsers();
});

e.on('more user info', (str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list checks', (str) => {
  cli.responders.listChecks(str);
});

e.on('more check info', (str) => {
  cli.responders.moreCheckInfo(str);
});

e.on('list logs', (str) => {
  cli.responders.listLogs(str);
});

e.on('more log info', (str) => {
  cli.responders.moreLogInfo(str);
});

// Responders object
cli.responders = {};

// Help / Man
cli.responders.help = (str) => {
  const commands = {
    'exit': 'Kill the CLI (and the rest of the application)',
    'man': 'Show this help page',
    'help': 'Alias of the "man" command',
    'stats': 'Get statistics on the underlying operating system and resource utilization',
    'list users': 'Show a list of all the registered (undeleted) users in the system',
    'more user info --{userId}': 'Show details of a specific user',
    'list checks --up --down': 'Show a list of all active checks in the system, including their state. The "--up" and "--down" flags are both optional',
    'more check info --{checkId}': 'Show details of a specific check',
    'list logs': 'Show a list of all log files available to be read (compressed and uncompressed)',
    'more log info --{fileName}': 'Show details of a specific log file',
  };

  //Show a header for the help page that is as wide as the screen
  cli.horizontalLine();
  cli.centered('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command followed by its explantion (white and yello respectively)
  for (var key in commands) {
    if (commands.hasOwnProperty(key)) {
      let line = `\x1b[33m${key}\x1b[0m`;
      const value = commands[key];
      const padding = 60 - line.length;

      for (let i = 0; i < padding; i++) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }
  cli.verticalSpace(1);
  cli.horizontalLine();
};

// Create a vertical space
cli.verticalSpace = (lines) => {
  lines = typeof(lines) === 'number'&& lines > 0 ? lines : 1;
  for (let i = 0; i < lines; i++) {
    console.log('');
  }
};

// Create a horizontal line across the screen
cli.horizontalLine = () => {
  // Get the available screen size
  const width = process.stdout.columns;

  // Put in enough dashes to go across the screen
  let line = '';
  for (i = 0; i < width; i++) {
    line += '-';
  }
  console.log(line);
};

// Create centered text on the screen
cli.centered = (str) => {
  str = typeof(str) === 'string' && str.trim().length > 0 ? str.trim() : '';

  // Get the available screen size
  const width = process.stdout.columns;

  // Calculate the left padding there should be
  const leftPadding = Math.floor((width - str.length) / 2);

  // Put in left padded spaces before the string itself
  let line = '';
  for (i = 0; i < leftPadding; i++) {
    line += ' ';
  }
  line += str;
  console.log(line);
};

// Exit
cli.responders.exit = (str) => {
  process.exit(0);
};

// Stats
cli.responders.stats = (str) => {
  console.log('You asked for stats');
};

// List users
cli.responders.listUsers = (str) => {
  console.log('You asked for list users');
};

// More user info
cli.responders.moreUserInfo = (str) => {
  console.log('You asked for more user info', str);
};

// List checks
cli.responders.listChecks = (str) => {
  console.log('You asked to list checks', str);
};

// More check info
cli.responders.moreCheckInfo = (str) => {
  console.log('You asked for more check info', str);
};

// List logs
cli.responders.listLogs = (str) => {
  console.log('You asked to list logs', str);
};

// More log info
cli.responders.moreLogInfo = (str) => {
  console.log('You asked for more log info', str);
};

// Input processor
cli.processInput = (str) => {
  str = typeof(str) === 'string' && str.trim().length > 0 ? str.trim() : false;

  // Only process the input if the user actually wrote something. Otherwise, ignore
  if (str) {
    // Codify the unique strings that identify the unique questions allowed to be asked
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info',
    ];

    // Go through the possible inputs, emit an event when a match is found
    let matchFound = false;
    let counter = 0;

    uniqueInputs.some((input) => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;

        // Emit and event matching the unique input and include the full string given
        e.emit(input, str);
        return true;
      }
    });

    // If no match is found, tell the user to try again
    if (!matchFound) {
      console.log('Sorry, try again');
    }
  }
};

// Init script
cli.init = () => {
  // Send the start message to the console in dark blue
  console.log('\x1b[34m%s\x1b[0m', 'The CLI is running');

  // Start the interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on('line', (str) => {
    // Send to the input processor
    cli.processInput(str);

    // Re-initialize the prompt afterwards
    _interface.prompt();
  });

  // If the user stops the CLI, kill the associated process
  _interface.on('close', () => {
    process.exit(0);
  });

};

module.exports = cli;