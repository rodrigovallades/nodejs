/*
 * Frotend logic for the App
 *
 */

// Container for the frontend application
const app = {};

// Config
app.config = {
  sessionToken: false,
};

// AJAX client (for the restful API)
app.client = {};

app.client.test = function() {
  console.log('teste')
};

// Interface for making API calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
  headers = typeof(headers) === 'object' && headers !== null ? headers : {};
  path = typeof(path) === 'string' ? path : '/';
  method = typeof(method) === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) === 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) === 'object' && payload !== null ? payload : {};
  callback = typeof(callback) === 'function' ? callback : false;

  // For each query string parameter sent, add it the path
  const requestUrl = `${path}?`;
  const counter = 0;

  for (const queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at least one query string parameter has already been added, prepend new ones with an ampersand
      if (counter > 1) {
        requestUrl=+'&';
      }
      requestUrl+=`${queryKey}=${queryStringObject[queryKey]}`;
    }
  }

  // Form the http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-Type','application/json');

  for (const headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = () => {
    if(xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;

      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, false);
        }
      }
    }
  }

  // Send the payload as JSON
  const payloadString = JSON.stringify(payload);

  xhr.send(payloadString);
};
