/*
 * Test runner
 *
 */

// Override the NODE_ENV variable
process.env.NODE_ENV = 'testing';

// Application logic for the test runner
_app = {};

// Container for the test
_app.tests = {};

// Add on th unit tests
_app.tests.unit = require('./unit');
_app.tests.api = require('./api');

// Count all the tests
_app.countTests = () => {
  let counter = 0;
  for (const key in _app.tests) {
    if (_app.tests.hasOwnProperty(key)) {
      const subTests = _app.tests[key];
      for (const testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          counter++;
        }
      }
    }
  }
  return counter;
};

// Run all the tests collecting errors and successes
_app.runTests = () => {
  let errors = [];
  let successes = 0;
  let limit = _app.countTests();
  let counter = 0;

  for (const key in _app.tests) {
    if (_app.tests.hasOwnProperty(key)) {
      const subTests = _app.tests[key];
      for (const testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          (function() {
            const tmpTestName = testName;
            const testValue = subTests[testName];

            // Call the test
            try {
              testValue(() => {
                console.log('\x1b[32m%s\x1b[0m', tmpTestName);
                counter++;
                successes++;

                if (counter == limit) {
                  _app.produceTestReport(limit, successes, errors);
                }
              });
            } catch (e) {
              // If it throws, then it failed. Capture the error and log it in red
              errors.push({
                name: testName,
                error: e,
              });
              console.log('\x1b[31m%s\x1b[0m', tmpTestName);
              counter++;

              if (counter == limit) {
                _app.produceTestReport(limit, successes, errors);
              }
            }
          })();
        }
      }
    }
  }
};

// Produce the test outcome report
_app.produceTestReport = (limit, successes, errors) => {
  console.log('');
  console.log('--------- BEGIN TEST REPORT ---------');
  console.log('');
  console.log(`Total tests: ${limit}`);
  console.log(`Pass: ${successes}`);
  console.log(`Fail: ${errors.length}`);
  console.log('');

  // If there are errors, print them in details
  if (errors.length) {
    console.log('--------- BEGIN ERROR DETAILS ---------');
    console.log('');

    errors.forEach(testError => {
      console.log('\x1b[31m%s\x1b[0m', testError.name);
      console.log(testError.error);
      console.log('');
    });
    console.log('');
    console.log('--------- END ERROR DETAILS ---------');

  }
  console.log('');
  console.log('--------- END TEST REPORT ---------');

  process.exit(0);
};

// Run the tests
_app.runTests();
