const argv = require('minimist')(process.argv.slice(2));
const express = require('express');
const _ = require('underscore');

const port = !_.isUndefined(argv.port) ? argv.port : 8080;
let app = express();

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
commonGet('/candles', 'candles');

app.listen(port, function() {
    console.log(`App listening on port ${port}`);
});
