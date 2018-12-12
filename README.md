# WUT - Web Unmixing Tool

The Interactive Audio Laboratory's browser-based interactive source separation app. This application allows one to perform interactive audio source separation using deep clustering.

**This work is currently in pre-alpha stage and is under active development.**

## Installation

WUT requires Python 3.6 or later and [redis-server](https://redis.io/).

### Quick Installation

**WARNING:** this quick installation assumes macOS or Linux, and [`virtualenv`](https://virtualenv.pypa.io/en/latest/).

If you'd like full manual or scripted installation, see [INSTALL.md](INSTALL.md).

If you don't have `redis-server` you can use Homebrew on macOS or your package manager on a Linux distribution. You can also [install it manually](https://redis.io/topics/quickstart).

If you don't have `virtualenv` you can install it with `pip`: `pip install virtualenv`. *Note:* installation and use of `virtualenv` may conflict with Conda or other virtual environment managers if you have those installed.

Once you have Python 3.6 or later, `virtualenv`, and `redis-server` installed, run the following command (*Note:* this command assumes `python3` is aliased to your Python 3.6 or later installation):

```
git clone git@github.com:interactiveaudiolab/WUT.git
&& cd WUT
&& git checkout retrain
&& git submodule update --init
&& virtualenv wut_env --python=$(which python3)
&& source wut_env/bin/activate
&& pip install -r requirements.txt
&& redis-server &
&& cd app
&& python main.py
```
