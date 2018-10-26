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
    const handler = server.router.hasOwnProperty(trimmedPath) ? server.router[trimmedPath] : handlers.notFound;

    // Data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    handler(data, (statusCode, payload) => {

      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
      payload = typeof(payload) === 'object' ? payload : {};

      const payloadString = JSON.stringify(payload);

      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode);
      res.end(payloadString);

      console.log(`Return this response:`, statusCode, payloadString);
    });
  });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`));

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`));
}

module.exports = server;