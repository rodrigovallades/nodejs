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
            var hashedPassword = helpers.hash(password);

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
        _data.read('users', phone, (err, data) => {
          if(!err && data) {
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        })
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
          })
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
        })
      } else {
        callback(400, { error: 'Missing required field' });
      }
    },
  },
  ping: (data, callback) => callback(200, { ping: new Date() }),
  notFound: (data, callback) => callback(404, { error: 'Not found' }),
};

module.exports = handlers;
  