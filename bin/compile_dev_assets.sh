APP_DIR=/home/Scott/dev_scottmedwards_app
WEB_DIR=/var/www/dev_scottmedwards_app

lessc $APP_DIR/public/less/main.less $WEB_DIR/css/main.css

cp $APP_DIR/node_modules/underscore/underscore-min.js $WEB_DIR/js/
cp $APP_DIR/public/img/* $WEB_DIR/img/
cp $APP_DIR/public/js/* $WEB_DIR/js/
cp $APP_DIR/public/favicon.ico $WEB_DIR/favicon.ico
