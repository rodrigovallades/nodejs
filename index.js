/*
 * Primary file for the API
 *
 *
 */

// Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');

// The server should respond to all requests with a string 
const server = http.createServer((req,res) => {

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
      payload: buffer
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
});

// Start the server and have it listen on a port
server.listen(config.port, () => console.log(`The server is listening on port ${config.port} in ${config.envName} mode`));

// Handlers callback a http status code and a payload object
const handlers = {
  sample: (data, callback) => callback(406, { name: 'sample handler' }),
  notFound: (data, callback) => callback(404),
};

// Define a request router
const router = {
  sample: handlers.sample,
};
