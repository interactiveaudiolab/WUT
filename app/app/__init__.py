import logging
import logging.handlers

from . import views
from . import config
from . import separation_session
from . import utils
from . import app_obj

# Set folders up
from .config import INIT_FOLDERS
from . import utils

for folder in INIT_FOLDERS:
    utils.safe_makedirs(folder)

# temporarily disable 'werkzeug` logging, redirect to file in the future
# TODO: shouldn't use `werkzeug` in production, use something like `gunicorcn`
logging.getLogger("werkzeug").disabled = True

# set up a logger
logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)8s] --- %(message)s (%(filename)s:%(lineno)s)",
    "%Y-%m-%d %H:%M:%S",
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)
