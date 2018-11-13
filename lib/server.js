/*
 * Server-related tasks
 *
 */

// Dependencies
const http = require('http');
const https = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// Instantiate the server module object
var server = {};

// Instantiating the HTTP server
server.httpServer = http.createServer((req,res) => {
  server.unifiedServer(req, res);
});


// Instantiating the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req,res) => {
  server.unifiedServer(req, res);
});

// All the server logic for both the http and https servers
server.unifiedServer = (req, res) => {

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g,'');
  const method = req.method.toUpperCase();
  const queryStringObject = parsedUrl.query;
  const headers = req.headers;
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  // Get the payload, if any
  req.on('data', data => buffer += decoder.write(data))
  req.on('end', () => {

    buffer += decoder.end();

    // Choose request handler
    const chosenHandler = server.router.hasOwnProperty(trimmedPath) ? server.router[trimmedPath] : handlers.notFound;

    // Data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    try {
      chosenHandler(data, (statusCode, payload, contentType) => {
        server.processHandlerResponse(res, method, trimmedPath, statusCode, payload, contentType)
      });
    } catch (e) {
      debug(e);
      server.processHandlerResponse(res, method, trimmedPath, 500, { error: 'An unknown error has occured' }, 'json');
    }
  });
};

// Process the response from the handler
server.processHandlerResponse = (res, method, trimmedPath, statusCode, payload, contentType) => {
  contentType = typeof(contentType) === 'string' ? contentType : 'json';
  statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

  let payloadString = '';
  if (contentType === 'json') {
    res.setHeader('Content-Type', 'application/json')
    payload = typeof(payload) === 'object' ? payload : {};
    payloadString = JSON.stringify(payload);
  }
  if (contentType === 'html') {
    res.setHeader('Content-Type', 'text/html')
    payloadString = typeof(payload) === 'string' ? payload : '';
  }

  res.writeHead(statusCode);
  res.end(payloadString);

  // If the response is 200, print green. Otherwise, print red
  if (statusCode == 200) {
    debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
  } else {
    debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
  }
};


// Define a request router
server.router = {
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  'ping': handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'examples/error': handlers.exampleError,
};

server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} in ${config.envName} mode`);
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
  });
}

module.exports = server;
