/*
 * Helpers for various tasks
 *
 */

const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

const helpers = {};

// Sample for testing that simply returns a number
helpers.getANumber = () => {
  return 1;
};

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

helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;

  if (strLength) {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let str = '';

    for(i = 1; i <= strLength; i++) {
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      str += randomCharacter;
    }

    return str;
  } else {
    return false;
  }
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

  if (phone && msg) {
    // Configure the request payload
    const payload = {
      from: config.twilio.fromPhone,
      to: `+1${phone}`,
      body: msg
    }

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    var requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if the request went through
      if (status === 200 || status === 201) {
        callback(200);
      } else {
        callback(`Status code returned: ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => callback(e));

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback('Given parameters missing or invalid');
  }
};

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
  templateName = typeof(templateName) === 'string' && templateName.length > 0 ? templateName : false;

  if (templateName) {
    const templatesDir = path.join(__dirname, '/../templates/');

    fs.readFile(`${templatesDir}${templateName}.html`, 'utf8', (err, str) => {
      if (!err && str && str.length > 0) {
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

// Add the universal header and footer to a string and pass the provided objet to the header and footer to interpolation
helpers.addUniversalTemplates = (str, data, callback) => {
  str = typeof(str) === 'string' && str.length > 0 ? str : '';
  data = typeof(data) === 'object' && data !== null ? data : {};

  helpers.getTemplate('_header', data, (err, headerString) => {
    if (!err && headerString) {

      helpers.getTemplate('_footer', data, (err, footerString) => {
        if (!err && footerString) {
          const fullStr = headerString+str+footerString;
          callback(false, fullStr);
        } else {
          callback('Could not find the footer template');
        }
      })
    } else {
      callback('Could not find the header template');
    }
  })
};

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
  str = typeof(str) === 'string' && str.length > 0 ? str : '';
  data = typeof(data) === 'object' && data !== null ? data : {};

  for (const keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  }

  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
      const replace = data[key];
      const find = `{${key}}`;

      str = str.replace(find, replace);
    }
  }
  return str;
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = (fileName, callback) => {
  fileName = typeof(fileName) === 'string' && fileName.length > 0 ? fileName : false;

  if (fileName) {
    const publicDir = path.join(__dirname, '/../public/');
    console.log(publicDir+fileName);

    fs.readFile(publicDir+fileName, (err, data) => {
      if (!err && data) {
        callback(false, data);
      } else {
        callback('Static asset not found');
      }
    });
  } else {
    callback('A valid filename was not specified')
  }
};

module.exports = helpers;
