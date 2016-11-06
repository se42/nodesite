var http = require('http');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

http.createServer(function (request, response) {
  fs.readFile(__dirname + '/html/hello_world.html', (error, htmlContent) => {
    if(error) {
      response.writeHead(500, {'Content-Type': 'text/html'});
      response.end('<h1>500</h1><p>Sorry...</p>');
    }
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(htmlContent);
  });
}).listen(argv.port, 'localhost');
