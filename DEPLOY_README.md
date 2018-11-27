# Deploying WUT Locally

First clone this repo, then checkout the `py3` branch:

```
git clone https://github.com/interactiveaudiolab/WUT.git # ssh: git@github.com:interactiveaudiolab/WUT.git
git checkout py3
```

Now follow either the Scripted or Manual methods listed below to setup and run WUT.

*Note:* These instructions work for Linux & macOS. Windows users may be able to get WUT running using WSL with the manual instructions.

## Scripted

To install dependencies & then launch WUT, run the following commands from the repo root then visit `localhost:5000` in your browser.

```
sh scripts/setup.sh # only needed the first time
source scripts/run.sh
```

You only need to run `setup.sh` once. For future launchings of WUT just run `source scripts/run.sh` from the repo root.

## Manual

You'll need to have `redis-server` installed. See the [Redis Quick Start](https://redis.io/topics/quickstart) page or run `brew install redis` (if you have `brew`) or `sudo apt install redis-server` (fill in your package manager if not on Ubuntu).

It's recommended, though not required, to run from a virtual environment for cleaner dependency management (the `setup.sh` script creates one for you). Either `pipenv` or `virtualenv` work for this, see more [here](https://pipenv.readthedocs.io/en/latest/).

Once you've installed `redis-server` (and optionally created and sourced a virtual environment) run the following commands (all from the repo root):

```
pip install -r requirements.txt
redis-server & # the & means run in the background
cd app # from the repo root
python main.py
```

Now navigate to `localhost:5000` in your browser to play with WUT!

### Killing `redis-server`

The script and manual methods for running both use `redis-server &` to run `redis-server` in the background so you can run `python main.py` in the same shell. Once you're done using WUT you'll want to kill this background job. There's a few different methods for doing so. Here's a few ways of doing so ([this Stack Overflow post](https://unix.stackexchange.com/questions/104821/how-to-terminate-a-background-process/104825) gives even more options):

#### Same shell

Here are two methods if you're still in the same shell you ran the script or `redis-server &` from:

1. `fg` will bring the background process to the foreground which you can then kill with `Ctrl-C`.
2. `jobs` will list the running jobs, which you can then kill with `kill %<job-num>` where job number is the number in `[]` shown by `jobs`.

#### Different shell

If you're no longer in the same shell then use `lsof -i:6379` to get the PID of the `redis-server` process and use `kill <PID>` to kill it (`6379` is the default `redis-server` port, if this doesn't show the expected process for some reason try `lsof -c redis-server` to list all running processes starting with `redis-server`).
