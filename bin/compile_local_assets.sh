APP_DIR=/Users/Scott/projects/NimbusNode
WEB_DIR=/Users/Scott/projects/dev_web_roots/NimbusNode

lessc $APP_DIR/public/less/main.less $WEB_DIR/css/main.css

cp $APP_DIR/node_modules/underscore/underscore-min.js $WEB_DIR/js/
cp $APP_DIR/public/img/* $WEB_DIR/img/
cp $APP_DIR/public/js/* $WEB_DIR/js/
