#!flask/bin/python

from app.app_obj import app_, socketio

if __name__ == '__main__':
    socketio.run(app_, debug=True)
