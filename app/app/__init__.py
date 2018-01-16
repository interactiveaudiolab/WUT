import logging

from . import views

# Set folders up
from config import INIT_FOLDERS
import utils

for folder in INIT_FOLDERS:
    utils.safe_makedirs(folder)

# Set up a logger
logger_name = 'WUT - Backend'
logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s %(name)-10s %(levelname)-8s %(filename)-12s %(funcName)-12s %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)
