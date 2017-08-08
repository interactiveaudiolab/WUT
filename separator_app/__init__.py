import logging

from flask import Flask
from flask_session import Session

# set up app
app = Flask(__name__)

SESSION_TYPE = 'filesystem'
app.config.from_object(__name__)
Session(app)

from separator_app import views

# Set folders up
from config import INIT_FOLDERS, UPLOAD_BASE_FOLDER, Config
import utils

app.config['UPLOAD_FOLDER'] = UPLOAD_BASE_FOLDER
app.secret_key = Config.SECRET_KEY

for folder in INIT_FOLDERS:
    utils.safe_makedirs(folder)


# Set up a logger
logger_name = 'WUT - Backend'
# logger = logging.getLogger(logger_name)
logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s %(name)-12s %(levelname)-8s %(filename)s-8s %(funcName)s-8s %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)