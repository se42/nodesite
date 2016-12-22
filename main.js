var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var express = require('express');
var app = express();

app.set('view engine', 'pug');
app.set('views', './views');
app.get('/', (req, res) => res.render('base'));
app.get('/me', (req, res) => res.send("<p>Stuff about me</p>"));
app.get('/site', (req, res) => res.send("<p>Information about how I built this site, tools used, etc.</p>"));

app.listen(argv.port, function() {
    console.log(`App listening on port ${argv.port}`);
});
