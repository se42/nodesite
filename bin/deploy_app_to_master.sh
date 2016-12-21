cd /home/Scott/scottmedwards_app/
git checkout master
# no I would never do the following three steps at work...but it's easy for now
git fetch origin develop:develop
git merge develop
git push

npm install
sudo lessc /home/Scott/scottmedwards_app/less/main.less /var/www/scottmedwards_app/css/main.css
cp /home/Scott/scottmedwards_app/assets/img/* /var/www/scottmedwards_app/img/
pm2 restart app
