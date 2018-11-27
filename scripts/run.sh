#!/usr/bin/env bash

# path to virtual environment (can be absolute or relative)
# if no argument given defaults to `audio` folder at repo root
virtual_environment=${1:-$(git rev-parse --show-toplevel)/audio}

# <<<<< dependencies >>>>>

# this script must be sourced (`source run.sh`) for `virtualenv` sourcing to
# work
[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This script must be sourced to enable sourcing the virtual environment"\
    "(use \`source run.sh\` NOT \`sh run.sh\` or \`./run.sh\`)"

  # `exit 1` here since they're executing the script, `return` elsewhere
  exit 1
}

# check if virtual environment exists
[[ -f $virtual_environment/bin/activate ]] || {
  echo "There is no virtual environment @ path $virtual_environment. Run"\
    "\`sh setup.sh\` to create one or do it manually then pass the path to"\
    "this script."
  return
}

# check if `redis-server` installed
command -v redis-server > /dev/null 2>&1 || {
  echo "WUT requires \`redis-server\` to store sessions. To install run"\
    "\`sh setup.sh\` or see https://redis.io/topics/quickstart for manual"\
    "installation."
  return
}

# <<<<< end of dependencies >>>>>

# source virtual environment
source $virtual_environment/bin/activate

# run `redis-server` in the background
# Note: this allows you to run the `redis-server` and the app in the same window
# but you will need to manually kill the job when you're done with WUT, there
# several ways to do so (see the reference at the end of this comment for more),
# here are two methods (assuming you're in the same shell you ran this script
# and that you've already killed the `python` process from):
# 1. `fg` will bring the background process to the foreground which you can
#    then kill with `Ctrl-C`
# 2. `jobs` will list the running jobs, which you can then kill with
#    `kill %<job-num>` where job number is the number in `[]` shown in by `jobs`
# TODO: emit helpful error message if port already taken (likely due to another
# `redis-server` process that wasn't killed
# ref - https://unix.stackexchange.com/questions/104821/how-to-terminate-a-background-process/104825
# first check if `redis-server` is already running
redis-cli ping > /dev/null 2>&1 && {
  : # already running, do nothing
} || {
  redis-server &
}

# run `main.py` to start up WUT!
# TODO: remove hacky `cd` then `python` required due to relative `nussl` import
cd $(git rev-parse --show-toplevel)/app
python main.py
