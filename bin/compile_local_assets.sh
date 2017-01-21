APP_DIR=/Users/Scott/projects/NimbusNode
WEB_DIR=/Users/Scott/projects/dev_web_roots/NimbusNode

cp $APP_DIR/node_modules/materialize-css/fonts/roboto/* $WEB_DIR/fonts/roboto/
sass $APP_DIR/public/sass/main.scss $WEB_DIR/css/main.css

cp $APP_DIR/node_modules/underscore/underscore-min.js $WEB_DIR/js/
cp $APP_DIR/public/img/* $WEB_DIR/img/
cp $APP_DIR/public/js/* $WEB_DIR/js/
