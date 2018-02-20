#!/bin/sh

exec /usr/bin/redis-server &

exec /usr/bin/supervisord