#!/bin/sh

#PUBLIC_URL=$(curl http://169.254.169.254/latest/meta-data/public-hostname)

#echo "
#server {
#    listen      80;
#
#    location / {
#        proxy_pass http://0.0.0.0:5000/;
#        proxy_set_header Host \$host;
#        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#    }
#
#    location /socket.io {
#        include proxy_params;
#        proxy_http_version 1.1;
#        proxy_buffering off;
#        proxy_set_header Upgrade \$http_upgrade;
#        proxy_set_header Connection \"Upgrade\";
#        proxy_pass http://$PUBLIC_URL:/socket.io;
#    }
#}" > /etc/nginx/sites-enabled/flask.conf

exec /usr/bin/supervisord