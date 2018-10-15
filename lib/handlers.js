/*
 * Request handlers
 *
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Handlers callback a http status code and a payload object
const handlers = {
  users: (data, callback) => {

    const method = data.method.toLowerCase();
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.includes(method)) {
      handlers._users[method](data, callback);
    } else {
      callback(405, 'Method not allowed');
    }
  },
  _users: {
    post: (data, callback) => {

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
    },
    get: (data, callback) => {
 
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
    },
    put: (data, callback) => {

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
                  if (firstName) {
                    userData.firstName = firstName;
                  }
                  if (lastName) {
                    userData.lastName = lastName;
                  }
                  if (password) {
                    userData.hashedPassword = helpers.hash(password);
                  }
                  _data.update('users', phone, userData, (err) => {
                    if (!err) {
                      callback(200);
                    } else {
                      console.log(err);
                      callback(500, { error: 'Could not update the user' })
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
          callback(400, { error: 'Missing fields to update' })
        }
      } else {
        callback(400, { error: 'Missing required field' });
      }
    },
    delete: (data, callback) => {

      const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
      if (phone) {

          // Get the token from the headers
          const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

          // Verify that the given token from headers is valid for the phone number
          handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {

            if (tokenIsValid) {
              _data.read('users', phone, (err, data) => {
                if(!err && data) {
                  _data.delete('users', phone, (err) => {
                    if (!err) {
                      callback(200);
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
    },
  },
  tokens: (data, callback) => {

    const method = data.method.toLowerCase();
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.includes(method)) {
      handlers._tokens[method](data, callback);
    } else {
      callback(405, 'Method not allowed');
    }
  },
  // Tokens - post
  // Required data: phone, password
  // Optional data: none
  _tokens: {
    post: (data, callback) => {

      const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
      const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length ? data.payload.password.trim() : false;
        
      if (phone && password) {
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {

            const hashedPassword = helpers.hash(password);

            if (hashedPassword == userData.hashedPassword) {
              
              const tokenId = helpers.createRandomString(20);
              const expires = Date.now() + 1000 * 60 * 60;

              const tokenObject = {
                phone,
                id: tokenId,
                expires,
              }

              _data.create('tokens', tokenId, tokenObject, (err) => {

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
    },
    // Tokens - get
    // Required data: id
    // Optional data: none
    get: (data, callback) => {

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
    },
    // Tokens - put
    // Required data: id, extend
    // Optional data: none
    put: (data, callback) => {

      const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length  === 20 ? data.payload.id.trim() : false;
      const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;

      console.log('data.payload:', data.payload);
      console.log(extend);
      console.log(extend);
      
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
              callback(400, { error: 'The token has already expired' })
            }
          } else {
            callback(400, { error: 'Specified token does not exist' });
          }
        })
      } else {
        callback(400, { error: 'Missing required field(s) or field(s) are invalid' });
      }
    },
    // Tokens - delete
    // Required data: id
    // Optional data: none
    delete: (data, callback) => {

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
    },
    verifyToken: (id, phone, callback) => {
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
    },
  },
  ping: (data, callback) => callback(200, { ping: new Date() }),
  notFound: (data, callback) => callback(404, { error: 'Not found' }),
};

module.exports = handlers;
  