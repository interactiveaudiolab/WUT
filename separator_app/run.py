#!flask/bin/python

from separator_app import app

if __name__ == '__main__':
    print('In main!')
    app.run(host='0.0.0.0') #, debug=True) # , threaded=True)