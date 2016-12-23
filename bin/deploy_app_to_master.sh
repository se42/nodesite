cd /home/Scott/scottmedwards_app/
git checkout master
# no I would never do the following three steps at work...but it's easy for now
git fetch origin develop:develop
git merge develop
git push

npm install
lessc /home/Scott/scottmedwards_app/public/less/*.less /var/www/scottmedwards_app/css/
cp /home/Scott/scottmedwards_app/public/img/* /var/www/scottmedwards_app/img/
cp /home/Scott/scottmedwards_app/public/js/* /var/www/scottmedwards_app/js/
pm2 restart app
