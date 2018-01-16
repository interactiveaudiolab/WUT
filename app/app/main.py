#!flask/bin/python

from flask import Flask
from flask_session import Session
from werkzeug.contrib.fixers import ProxyFix

# set up app
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)

SESSION_TYPE = 'filesystem'
app.config.from_object(__name__)
Session(app)

# app.config['SERVER_NAME'] = 'localhost'

from config import UPLOAD_BASE_FOLDER, Config

app.config['UPLOAD_FOLDER'] = UPLOAD_BASE_FOLDER
app.secret_key = Config.SECRET_KEY

if __name__ == '__main__':
    print('In main!')
    app.run(host='0.0.0.0', debug=True, port=80) # , threaded=True)