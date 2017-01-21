APP_DIR=/home/Scott/scottmedwards_app
WEB_DIR=/var/www/scottmedwards_app

cd $APP_DIR
git checkout master
# no I would never do the following three steps at work...but it's easy for now
git fetch origin develop:develop
git merge develop
git push

npm install

mkdir -p $WEB_DIR/fonts/roboto

cp $APP_DIR/node_modules/materialize-css/fonts/roboto/* $WEB_DIR/fonts/roboto/
sass $APP_DIR/public/sass/main.scss $WEB_DIR/css/main.css

cp $APP_DIR/node_modules/underscore/underscore-min.js $WEB_DIR/js/
cp $APP_DIR/public/img/* $WEB_DIR/img/
cp $APP_DIR/public/js/* $WEB_DIR/js/
cp $APP_DIR/public/favicon.ico $WEB_DIR/favicon.ico

pm2 restart app
