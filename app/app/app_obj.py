
from flask import Flask
from flask_session import Session
from werkzeug.contrib.fixers import ProxyFix
from flask_socketio import SocketIO

# set up app
app_ = Flask(__name__)
app_.wsgi_app = ProxyFix(app_.wsgi_app)

SESSION_TYPE = 'redis'
app_.config.from_object(__name__)
Session(app_)

socketio = SocketIO(app_)

from config import UPLOAD_BASE_FOLDER, Config

app_.config['UPLOAD_FOLDER'] = UPLOAD_BASE_FOLDER
app_.secret_key = Config.SECRET_KEY