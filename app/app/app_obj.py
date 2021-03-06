from flask import Flask
from flask_session import Session
from flask_redis import FlaskRedis
from werkzeug.contrib.fixers import ProxyFix
from flask_socketio import SocketIO

from .config import UPLOAD_BASE_FOLDER, SECRET_KEY, REDIS_URL

# Flask app setup
app_ = Flask(__name__)
app_.wsgi_app = ProxyFix(app_.wsgi_app)

# Redis setup
app_.config["REDIS_URL"] = REDIS_URL
redis_store = FlaskRedis(app_)

# Flask Sessions setup
SESSION_TYPE = "filesystem"
app_.config.from_object(__name__)
Session(app_)

# SocketIO setup
socketio = SocketIO(app_, ping_timeout=300, ping_interval=60)
socketio.manage_session = False

app_.config["UPLOAD_FOLDER"] = UPLOAD_BASE_FOLDER
app_.secret_key = SECRET_KEY
