FROM tiangolo/uwsgi-nginx-flask:python2.7

# Get libav-tools
RUN apt-get update && apt-get install libav-tools -y --force-yes

# Copy over our requirements.txt file
COPY requirements.txt /tmp/

# Upgrade pip and install required python packages
RUN pip install -U pip && pip install -r /tmp/requirements.txt

# Point nginx to the static directory
ENV STATIC_PATH /app/app/static

# Copy over the actuall webapp
COPY ./app /app
