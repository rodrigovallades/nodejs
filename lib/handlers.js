/*
 * Request handlers
 *
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const _url = require('url');
const dns = require('dns');
const { performance: _performance, PerformanceObserver } = require('perf_hooks');
const util = require('util');
const debug = util.debuglog('performance');

const handlers = {};

// Log out all measurements (Node 10+ syntax)
const performanceCallback = (list, observer) => {
  const measurements = list.getEntries();

  measurements.forEach(measurement => {
    debug('\x1b[33m%s\x1b[0m', `${measurement.name} ${measurement.duration}`);
  });
  observer.disconnect();
};

// Example error
handlers.exampleError = (data, callback) => {
  const err = new Error('This is an example error');
  throw(err);
};

// Handlers callback a http status code and a payload object
handlers.users = (data, callback) => {
  const method = data.method.toLowerCase();
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(method)) {
    handlers._users[method](data, callback);
  } else {
    callback(405, 'Method not allowed');
  }
};

handlers._users = {};

handlers._users.post = (data, callback) => {
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length ? data.payload.lastName.trim() : false;
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length ? data.payload.password.trim() : false;
  const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement;

  if (firstName && lastName && phone && password && tosAgreement) {
    _data.read('users', phone, (err, data) => {
      if (err) {
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          const user = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement,
          };

          _data.create('users', phone, user, (err) => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { error: 'Could not create the new user' });
            }
          });
        } else {
          callback(500, { error: 'Could not hash the password'} );
        }
      } else {
        callback(400, { error: 'User already exists'});
      }
    });
  } else {
    callback(400, { error: 'Missing required fields' });
  }
};

handlers._users.get = (data, callback) => {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Verify that the given token from headers is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, data) => {
          if(!err && data) {
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { error: 'Missing required token in header, or token is invalid' });
      }
    });
  } else {
    callback(400, { error: 'Missing required field'} );
  }
};

handlers._users.put = (data, callback) => {
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length ? data.payload.lastName.trim() : false;
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length ? data.payload.password.trim() : false;

  if (phone) {
    if (firstName || lastName || password) {
      // Get the token from the headers
      const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
      // Verify that the given token from headers is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              if (firstName) { userData.firstName = firstName }
              if (lastName) { userData.lastName = lastName }
              if (password) { userData.hashedPassword = helpers.hash(password) }

              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { error: 'The specified user does not exist' });
            }
          });
        } else {
          callback(403, { error: 'Missing required token in header, or token is invalid' });
        }
      });
    } else {
      callback(400, { error: 'Missing fields to update' });
    }
  } else {
    callback(400, { error: 'Missing required field' });
  }
};

handlers._users.delete = (data, callback) => {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
      // Get the token from the headers
      const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
      // Verify that the given token from headers is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read('users', phone, (err, userData) => {
            if(!err && userData) {
              _data.delete('users', phone, (err) => {
                if (!err) {
                  // Delete each of the checks associated with the user
                  const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                  const checksToDelete = userChecks.length;

                  if (checksToDelete > 0) {
                    let checksDeleted = 0;
                    let deletionErrors = false;

                    // Loop through the checks
                    userChecks.forEach(id => {
                      // Delete the check
                      _data.delete('checks', id, (err) => {
                        if (err) {
                          deletionErrors = true;
                        }
                        checksDeleted++;
                        if (checksDeleted == checksToDelete) {
                          if (!deletionErrors) {
                            callback(200);
                          } else {
                            callback(500, { error: 'Errors while attempting to delete user checks. Not all checks have been deleted from the user.' })
                          }
                        }
                      });
                    })
                  } else {
                    callback(200);
                  }
                } else {
                  callback(500, { error: 'Could not delete the specified user' });
                }
              })
            } else {
              callback(400, { error: 'Could not find the specified user' });
            }
          });
        } else {
          callback(403, { error: 'Missing required token in header, or token is invalid' });
        }
      });
  } else {
    callback(400, { error: 'Missing required field' });
  }
};

handlers.tokens = (data, callback) => {
  const method = data.method.toLowerCase();
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(method)) {
    handlers._tokens[method](data, callback);
  } else {
    callback(405, 'Method not allowed');
  }
};

handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  // Log out all measurements (Node 10+ syntax)
  const obs = new PerformanceObserver(performanceCallback);
  obs.observe({ entryTypes: ['measure'], buffered: true });

  _performance.mark('entered function');
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length ? data.payload.password.trim() : false;
  _performance.mark('inputs validated');
  if (phone && password) {
    _performance.mark('beginning user lookup');
    _data.read('users', phone, (err, userData) => {
      _performance.mark('user lookup complete');
      if (!err && userData) {
        _performance.mark('beginning password hashing');
        const hashedPassword = helpers.hash(password);
        _performance.mark('password hashing complete');
        if (hashedPassword == userData.hashedPassword) {
          _performance.mark('creating data for token');
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };
          _performance.mark('beginning storing token');
          _data.create('tokens', tokenId, tokenObject, (err) => {
            _performance.mark('storing token complete');

            // Gather all measurements
            _performance.measure('Beginning to end', 'entered function', 'storing token complete');
            _performance.measure('Validating user input', 'entered function', 'inputs validated');
            _performance.measure('User lookup', 'beginning user lookup', 'user lookup complete');
            _performance.measure('Password hashing', 'beginning password hashing', 'password hashing complete');
            _performance.measure('Token data creation', 'creating data for token', 'beginning storing token');
            _performance.measure('Token storing', 'beginning storing token', 'storing token complete');

            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { error: 'Could not create new token' });
            }
          })
        } else {
          callback(400, { error: 'Password did not match the specified user\'s stored password' })
        }
      } else {
        callback(400, { error: 'Could not find the specified user' });
      }
    })
  } else {
    callback(400, { error: 'Missing required field(s)' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('tokens', id, (err, tokenData) => {
      if(!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, { error: 'Missing required field'} );
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length  === 20 ? data.payload.id.trim() : false;
  const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;

  if (id && extend) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { error: 'Could not update the token\'s expiration' });
            }
          });
        } else {
          callback(400, { error: 'The token has already expired' });
        }
      } else {
        callback(400, { error: 'Specified token does not exist' });
      }
    })
  } else {
    callback(400, { error: 'Missing required field(s) or field(s) are invalid' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    _data.read('tokens', id, (err, data) => {
      if(!err && data) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { error: 'Could not delete the specified token' });
          }
        })
      } else {
        callback(400, { error: 'Could not find the specified token' });
      }
    })
  } else {
    callback(400, { error: 'Missing required field' });
  }
};

handlers._tokens.verifyToken = (id, phone, callback) => {
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      if(tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

handlers._checks = {};

handlers.checks = (data, callback) => {
  const method = data.method.toLowerCase();
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(method)) {
    handlers._checks[method](data, callback);
  } else {
    callback(405, 'Method not allowed');
  }
};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: node
handlers._checks.post = (data, callback) => {
  const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    const token = typeof(data.headers.token == 'string') ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;

        _data.read('users', userPhone, (err, userData) => {
            if (!err && userData) {
            const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

            // Verify that the user has less than the number of max checks per user
            if (userChecks.length < config.maxChecks) {
              // Verify that the URL given has DNS entries (and therefore can resolve)
              const parsedUrl = _url.parse(`${protocol}://${url}`, true);
              const hostName = typeof(parsedUrl.hostname) === 'string' && parsedUrl.hostname.length > 0 ? parsedUrl.hostname : false;

              dns.resolve(hostName, (err, records) => {
                if (!err && records) {
                  // Create a random id for the check
                  const checkId = helpers.createRandomString(20);
                  // Create the check object and include the user's phone
                  const checkObject = {
                    id: checkId,
                    userPhone,
                    protocol,
                    url,
                    method,
                    successCodes,
                    timeoutSeconds,
                  };

                  _data.create('checks', checkId, checkObject, (err) => {
                    if (!err) {
                      // Add the check id to the user's object
                      userData.checks = userChecks;
                      userData.checks.push(checkId);

                      // Save the new usre data
                      _data.update('users', userPhone, userData, (err) => {
                        if (!err) {
                          // Return the data about the new check
                          callback(200, checkObject);
                        } else {
                          callback(500, { error: 'Could not update the user with the new check' });
                        }
                      })
                    } else {
                      callback(500, { error: 'Could not create new check' });
                    }
                  });
                } else {
                  callback(400, { error: 'The hostname of the URL entered did not resolve to any DNS entries' });''
                }
              });
            } else {
              callback(400, { error: `The user already has the maximum of checks (${config.maxChecks})`});
            }
          } else {
            callback(403);
          }
        })
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { error: 'Missing required inputs or inputs are invalid' });
  }
};

// Checks - get
// Required data: id
// Optional data: node
handlers._checks.get = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
      if(!err && checkData) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // Verify that the given token from headers is valid for the check
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            //Return the check data
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, { error: 'Missing required field'} );
  }
};

// Checks - put
// Required data: id,
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = (data, callback) =>  {
  const id = typeof(data.payload .id) === 'string' && data.payload .id.trim().length === 20 ? data.payload .id.trim() : false;

  const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Check to make sure id is valid
  if (id) {
    // Check to make sure one or more optional fields has been sent
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the check
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // Verify that the given token from headers is valid for the check
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            if (protocol) { checkData.protocol = protocol };
            if (url) { checkData.url = url };
            if (method) { checkData.method = method };
            if (successCodes) { checkData.successCodes = successCodes };
            if (timeoutSeconds) { checkData.timeoutSeconds = timeoutSeconds };

            // Store the new updates
            _data.update('checks', id, checkData, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { error: 'Could not update check' });
              }
            });
          } else {
            callback(403);
          }
        });
        } else {
          callback(400, { error: 'Check ID does not exist' });
        }
      });
    } else {
      callback(400, { error: 'Missing fields to update' });
    }
  } else {
    callback(400, { error: 'Missing required fields' });
  }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
      // Lookup the check
      _data.read('checks', id, (err, checkData) => {
        if(!err && checkData) {
          // Get the token from the headers
          const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
          // Verify that the given token from headers is valid for the phone number
          handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Delete the check data
              _data.delete('checks', id, (err) => {
                if (!err) {
                  // Lookup the user
                  _data.read('users', checkData.userPhone, (err, userData) => {
                    if(!err && userData) {
                      const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Remove the deleted check from their list of checks
                      const checkPosition = userChecks.indexOf(id);

                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1);
                        _data.update('users', checkData.userPhone, userData, (err) => {
                          if (!err) {
                            callback(200);
                          } else {
                            callback(500, { error: 'Could not update the user' });
                          }
                        })
                      } else {
                        callback(500, { error: 'Could not find the check on the users object, so could not remove it' });
                      }
                    } else {
                      callback(500, { error: 'Could not find the user that created the check, could not remove check' });
                    }
                  });
                } else {
                  callback(500, { error: 'Could not delete check data ' })
                }
              });
            } else {
              callback(403, { error: 'Missing required token in header, or token is invalid' });
            }
          });
        } else {
          callback(400, { error: 'The specified ID does not exist' })
        }
      });
  } else {
    callback(400, { error: 'Missing required field' });
  }
};

handlers.ping = (data, callback) => callback(200, { ping: new Date() });

handlers.notFound = (data, callback) => callback(404, { error: 'Not found' });

module.exports = handlers;
