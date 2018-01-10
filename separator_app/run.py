#!flask/bin/python

from separator_app import app

if __name__ == '__main__':
    app.run(debug=False) # , threaded=True)