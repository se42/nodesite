cd /home/Scott/dev_scottmedwards_app
pm2 start main.js --name dev_app -- --port 8081

cd /home/Scott/scottmedwards_app
pm2 start main.js --name app -- --port 8080
