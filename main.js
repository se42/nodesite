var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var express = require('express');
var app = express();

app.set('view engine', 'pug');
app.set('views', './views');
app.get('/', (req, res) => res.render('about_me'));
app.get('/me', (req, res) => res.render('about_me'));
app.get('/site', (req, res) => res.render('about_site'));

app.listen(argv.port, function() {
    console.log(`App listening on port ${argv.port}`);
});
