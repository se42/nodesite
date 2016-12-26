cd /home/Scott/scottmedwards_app/
git checkout master
# no I would never do the following three steps at work...but it's easy for now
git fetch origin develop:develop
git merge develop
git push

npm install
lessc /home/Scott/scottmedwards_app/public/less/main.less /var/www/scottmedwards_app/css/main.css
cp /home/Scott/scottmedwards_app/public/img/* /var/www/scottmedwards_app/img/
cp /home/Scott/scottmedwards_app/public/js/* /var/www/scottmedwards_app/js/
cp /home/Scott/scottmedwards_app/public/favicon.ico /var/www/scottmedwards_app/favicon.ico
pm2 restart app
