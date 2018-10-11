/*
 * Helpers for various tasks
 *
 */

const crypto = require('crypto');
const config = require('./config');

const helpers = {};

helpers.hash = str => {
  if (typeof(str) === 'string' && str.length) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  } else {
    return false;
  }
};

helpers.parseJsonToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch(e) {
    return {}
  }
};

module.exports = helpers;
