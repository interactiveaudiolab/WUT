#!/usr/bin/env bash

# setup
# 2. install pip dependencies
# 3. install redis-server
#  - if they have home brew use that
#  - if not ask to install manually (require sudo)

# path to virtual environment (can be absolute or relative)
# if no argument given defaults to `audio` folder at repo root
virtual_environment=${1:-$(git rev-parse --show-toplevel)/audio}

# source virtual environment if it exists, else return
if [[ "$VIRTUAL_ENV" != "" ]]; then : # pass, already in a virtual environment
elif [[ -f $virtual_environment/bin/activate ]]; then
  source $virtual_environment/bin/activate
else
  echo "There is no virtual environment @ path '$virtual_environment'."\
    "Would you like to create one @ path '$virtual_environment'? (y/n)"
  read -n 1 action
  echo "\n"

  [[ $action = "y" ]] && {
    command -v virtualenv > /dev/null 2>&1 || {
      echo "\nTo create a new virtual environment you need to have the"\
        "\`virtualenv\` tool. See"\
        "https://docs.python-guide.org/dev/virtualenvs/#lower-level-virtualenv"\
        "for more details.\nWould you like to install it with pip? (y/n)"
      read -n 1 action
      echo "\n"
      [[ $action = "y" ]] && {
        pip install virtualenv # assumes they have `pip`
      } || {
        echo "If you'd like to continue, either rerun and hit y, install"\
          "virtualenv separately, or use any other service to create a virtual"\
          "environment then pass the corresponding path to this script."
        exit 1
      }
    }
  } || {
    echo "If you'd like to continue, either rerun and hit y, or create a"\
      "virtual environment then pass the corresponding path to this script."
    exit 1
  }

  virtualenv $virtual_environment
  source $virtual_environment/bin/activate
fi

# inside virtual environment at this point
pip install -r $(git rev-parse --show-toplevel)/requirements.txt

# check if `redis-server` is installed
command -v redis-server > /dev/null 2>&1 || {
  echo "WUT requires \`redis-server\`. Would you like to install it?"
  install_question="("
  command -v brew > /dev/null 2>&1 && { install_question+="b to use brew, "; }
  # m for make
  install_question+="m to build locally (requires sudo) or any other"
  install_question+=" character to quit)"
  echo $install_question
  read -n 1 action
  echo "\n"

  case "$action" in
    b )
      brew install redis;;
    m )
      mkdir tmp_build
      cd tmp_build
      curl -O http://download.redis.io/redis-stable.tar.gz
      tar xvzf redis-stable.tar.gz
      cd redis-stable
      make
      sudo make install
      cd ../..
      rm -rf tmp_build
      ;;
    * )
      echo "If you'd like to continue, either rerun and hit b or m, or install"\
        "\`redis-server\` separately."
      exit 1;;
  esac
}

echo "All dependencies have been set up. Source run.sh"\
  "(\`source scripts/run.sh\`) to run WUT!"
