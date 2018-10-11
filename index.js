/*
 * Primary file for the API
 *
 *
 */

// Dependencies
const http = require('http');
const https = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiating the HTTP server
const httpServer = http.createServer((req,res) => {
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () => console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`));

// Instantiating the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (req,res) => {
  unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`));

const unifiedServer = (req, res) => {
  
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
    const handler = router.hasOwnProperty(trimmedPath) ? router[trimmedPath] : handlers.notFound;

    // Data objecdt to send to the handler
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
const router = {
  ping: handlers.ping,
  users: handlers.users,
};
