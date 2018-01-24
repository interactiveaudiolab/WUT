FROM ubuntu:xenial

ENV DEBIAN_FRONTEND noninteractive

# Install required tools
RUN apt-get update
RUN apt-get install -y python python-pip python-virtualenv python-tk nginx gunicorn supervisor

# Get libav-tools
RUN apt-get update && apt-get install libav-tools -y --force-yes

# Copy over our requirements.txt file and install required python packages
COPY requirements.txt /tmp/
RUN pip install -U pip && pip install -r /tmp/requirements.txt

# Point nginx to the static directory
ENV STATIC_PATH /app/app/static

# Copy over the actual webapp
COPY ./app /app

# Copy over the entrypoint script
COPY entrypoint.sh /
RUN chmod +x entrypoint.sh

# Setup nginx
RUN rm /etc/nginx/sites-enabled/default
COPY flask.conf /etc/nginx/sites-available/
RUN ln -s /etc/nginx/sites-available/flask.conf /etc/nginx/sites-enabled/flask.conf
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Setup supervisord and gunicorn
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY gunicorn.conf /etc/supervisor/conf.d/gunicorn.conf

# Make directory for log files
RUN mkdir -p /logs

# Start processes
ENTRYPOINT ["/entrypoint.sh"]