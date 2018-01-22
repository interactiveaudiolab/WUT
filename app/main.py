#!flask/bin/python

from app.app_obj import app_, socketio

if __name__ == '__main__':
    # app.run(host='0.0.0.0', debug=True, port=80) # , threaded=True)
    socketio.run(app_, debug=True)
    # app_.run(debug=True) # , threaded=True)
