var http = require('http');
var fs = require('fs');
var port = process.argv[2];

http.createServer(function (request, response) {
  fs.readFile(__dirname + '/hello_world.html', (error, htmlContent) => {
    if(error) {
      response.writeHead(500, {'Content-Type': 'text/html'});
      response.end('<h1>500</h1><p>Sorry...</p>');
    }
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(htmlContent);
  });
}).listen(port, 'localhost');
