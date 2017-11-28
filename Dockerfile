# nginx-gunicorn-flask
# forked from https://github.com/danriti/nginx-gunicorn-flask

FROM ubuntu:14.04
MAINTAINER Ethan Manilow <ethanmanilow@gmail.com>

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get install -y python python-pip python-virtualenv nginx gunicorn supervisor
RUN apt-get install -y pkg-config libfreetype6-dev libpng-dev
RUN apt-get install -y libblas-dev liblapack-dev libatlas-base-dev gfortran
RUN apt-get install -y python-numpy python-scipy python-matplotlib python-pandas

# Setup flask application
RUN mkdir -p /deploy/separator_app
COPY separator_app /deploy/separator_app
RUN pip install -r /deploy/separator_app/requirements.txt

# Setup nginx
RUN rm /etc/nginx/sites-enabled/default
COPY flask.conf /etc/nginx/sites-available/
RUN ln -s /etc/nginx/sites-available/flask.conf /etc/nginx/sites-enabled/flask.conf
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Setup supervisord
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY gunicorn.conf /etc/supervisor/conf.d/gunicorn.conf

# Start processes
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]