## Deploying WUT

Here are the steps you need to take to deploy WUT to the web. WUT is built
with [Docker](https://www.docker.com/) and [AWS](https://aws.amazon.com/).

##### Before you start
This is a good general guide to getting a Flask app deployed on AWS:
<https://ianlondon.github.io/blog/deploy-flask-docker-nginx/>.
This guide is based off of that article, but built specifically for WUT.

#### Deploying

1. Launch a new EC2 instance. The free tier option, `t2.micro`, is fine for setup. 
You can scale up later if need be. Open up inbound traffic on port 80 (HTTP) in your
security group. `ssh` into your instance by following [this guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstancesLinux.html).

2. Upon initialization of your EC2 instance, install the necessary packages with the following
commands:

        sudo apt-get update
        sudo apt-get install python-dev python-pip git docker.io
        sudo pip install virtualenv

    It's important to install `docker.io` and not `docker`!

3. Clone the WUT repo onto your instance (using HTTP). You can clone a specific branch with the 
following command:

        git clone -b [my-branch] --single-branch https://github.com/interactiveaudiolab/WUT.git
        
    (As of this writing only the `docker` branch contains the files necessary to deploy using docker.)

4. Build the docker container:

        docker build -t [name_of_container] .
        
    where you replace `[name_of_container]` with a container name. 
    Note the period `.` at the end. This will take 2-5 minutes.

5. Run the docker container:

         docker run -p 80:80 -t [name_of_container]
         
     Or if you want to run persistently:
     
         docker run -d --restart=always -p 80:80 -t [name_of_container]
         
6. Go to the public DNS url.