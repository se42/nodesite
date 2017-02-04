APP_DIR=/home/Scott/dev_scottmedwards_app
WEB_DIR=/var/www/dev_scottmedwards_app

mkdir -p $WEB_DIR/fonts/roboto

cp $APP_DIR/node_modules/materialize-css/fonts/roboto/* $WEB_DIR/fonts/roboto/
sass $APP_DIR/public/sass/main.scss $WEB_DIR/css/main.css --sourcemap=none

cp $APP_DIR/node_modules/underscore/underscore-min.js $WEB_DIR/js/
cp $APP_DIR/public/img/* $WEB_DIR/img/
cp $APP_DIR/public/js/* $WEB_DIR/js/
cp $APP_DIR/public/favicon.ico $WEB_DIR/favicon.ico
