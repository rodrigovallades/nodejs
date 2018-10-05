/*
 * Primary file for the API
 *
 *
 */

// Dependencies
var http = require('http');
var url = require('url');

// The server should respond to all requests with a string 
var server = http.createServer((req,res) => {

    var parsedUrl = url.parse(req.url, true);
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/ˆ\/+|\/+$/g,'');
    var method = req.method.toUpperCase();

    // Send response
    res.end('Hello world\n')

    // Log request path
    console.log(`Request received on path: ${trimmedPath} with method: ${method}`); 
});




// Start the server and have it listen on port 3000
server.listen(3000, () => console.log('The server is listening on port 3000 now') )