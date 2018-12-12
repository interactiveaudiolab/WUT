# Deploying WUT Locally

First clone this repo:

```
git clone https://github.com/interactiveaudiolab/WUT.git # ssh: git clone git@github.com:interactiveaudiolab/WUT.git
```

WUT requires Python 3.6 or later and [redis-server](https://redis.io/). The Manual and Scripted methods below will each handle installing `redis-server` but not Python 3.6.

*Note:* These instructions have been tested on Linux & macOS. Windows users may be able to get WUT running using WSL with the manual instructions.


## Manual

You'll need to have `redis-server` installed. See the [Redis Quick Start](https://redis.io/topics/quickstart) page or use a package manager:

```shell
brew install redis # macOS
# or
sudo apt install redis # Ubuntu (change to your respective package manager)
```

It's recommended, though not required, to run from a virtual environment for cleaner dependency management (the `setup.sh` script creates one for you). Any package manager (`pipenv`, `virtualenv`, `conda`, etc.) can work here.

Once you've installed `redis-server` (and optionally created and sourced a virtual environment) run the following commands (all from the repo root):

```
pip install -r requirements.txt
redis-server & # the & means run in the background
cd app # from the repo root
python3 main.py # assuming `python3` is aliased to Python 3.6 or later
```

Now navigate to `localhost:5000` in your browser to play with WUT!

## Scripted

To install dependencies & then launch WUT, run the following commands from the repo root then visit `localhost:5000` in your browser.

**Note:** `setup.sh` assumes `virtualenv` and may cause issues if you use another virtual environment system such as Anaconda. If that is the case for you use the manual instructions above.

```
sh scripts/setup.sh # only needed the first time
source scripts/run.sh
```

You only need to run `setup.sh` once. For future launchings of WUT just run `source scripts/run.sh` from the repo root.

### Killing `redis-server`

The script and manual methods for running both use `redis-server &` to run `redis-server` in the background so you can run `python main.py` in the same shell. Once you're done using WUT you'll want to kill this background job. There's a few different methods for doing so. Here's a few ways of doing so ([this Stack Overflow post](https://unix.stackexchange.com/questions/104821/how-to-terminate-a-background-process/104825) gives even more options):

#### Same shell

Here are two methods if you're still in the same shell you ran the script or `redis-server &` from:

1. `fg` will bring the background process to the foreground which you can then kill with `Ctrl-C`.
2. `jobs` will list the running jobs, which you can then kill with `kill %<job-num>` where job number is the number in `[]` shown by `jobs`.

#### Different shell

If you're no longer in the same shell then use `lsof -i:6379` to get the PID of the `redis-server` process and use `kill <PID>` to kill it (`6379` is the default `redis-server` port, if this doesn't show the expected process for some reason try `lsof -c redis-server` to list all running processes starting with `redis-server`).
