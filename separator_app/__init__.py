from flask import Flask

app = Flask(__name__)
from separator_app import views
from separator_app.audio_processing import *
from config import UPLOAD_FOLDER, Config

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.secret_key = Config.SECRET_KEY