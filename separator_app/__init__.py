import logging

from flask import Flask
from flask_session import Session
# from flask_compress import Compress
from werkzeug.contrib.fixers import ProxyFix

# set up app
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)

SESSION_TYPE = 'filesystem'
app.config.from_object(__name__)
Session(app)
# Compress(app)

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
formatter = logging.Formatter('%(asctime)s %(name)-10s %(levelname)-8s %(filename)-12s %(funcName)-12s %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)