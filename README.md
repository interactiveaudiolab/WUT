# WUT - Web Unmixing Tool

WUT is the [Interactive Audio Laboratory's] (http://music.cs.northwestern.edu) browser-based interactive source separation app. This end-user application makes it easy for musicians, producers and podcasters to apply audio source separation to unmix a recording into individual tracks. For example, if you have a recording with two overlapping voices, or a recording with a voice and backing track and want to remove a voice, WUT makes it easy. WUT also learns from user interaction and correction, improving its performance for next time.

**This work is currently in pre-alpha stage and is under active development.**

## Installation
WUT is a client-server application that uses a Javascript front-end to connect to a Python back-end server.  

WUT requires Python 3.6 or later and [redis-server](https://redis.io/).

If you'd like full manual or scripted installation, see [INSTALL.md](INSTALL.md).

### Quick Installation

**WARNING:** this quick installation assumes macOS or Linux, and [`virtualenv`](https://virtualenv.pypa.io/en/latest/).

You'll need to have `redis-server` installed. See the [Redis Quick Start page](https://redis.io/topics/quickstart) for manual installation or use a package manager:

```shell
brew install redis # macOS
# or
sudo apt install redis # Ubuntu (change to your respective package manager)
```

If you don't have `virtualenv` you can install it with `pip` (*Note:* installation and use of `virtualenv` may conflict with Conda or other virtual environment managers if you have those installed):

```
pip install virtualenv
```

Once you have Python 3.6 or later, `virtualenv`, and `redis-server` installed, run the following command (*Note:* this command assumes `python3` is aliased to your Python 3.6 or later installation):

```
redis-server & # `&` runs in the background, see INSTALL.md for info
git clone git@github.com:interactiveaudiolab/WUT.git \
&& cd WUT \
&& git submodule update --init \
&& virtualenv wut_env --python=$(which python3) \
&& source wut_env/bin/activate \
&& pip install -r requirements.txt \
&& cd app \
&& python main.py
```
