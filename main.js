var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var express = require('express');
var app = express();

app.set('view engine', 'pug');
app.set('views', './views');

function commonGet(location, template) {
    let context = {isProductionSite: false};
    app.get(location, (req, res) => {
        if (req.hostname === 'scottmedwards.com') {
            context.isProductionSite = true;
        }
        res.render(template, context);
    });
}

commonGet('/', 'about_me');
commonGet('/me', 'about_me');
commonGet('/site', 'about_site');

app.listen(argv.port, function() {
    console.log(`App listening on port ${argv.port}`);
});
