import os
from separator_app import app
from separator_app import separation_session
from flask import render_template, request, flash, redirect, url_for, g, session
from werkzeug.utils import secure_filename
import nussl
import json
import numpy as np
from config import basedir, ALLOWED_EXTENSIONS
from audio_processing.repet import Repet

TOY = True

@app.route('/')
@app.route('/index')
def index():
    new_sess = separation_session.SeparationSession()
    session['cur_session'] = new_sess.to_json()
    # separation_session.make_new_session()
    # if not hasattr(g, 'separation_session'):
    #     g.separation_session = separation_session.SeparationSession()
    return render_template('index.html')


@app.errorhandler(404)
def page_not_found(*args):
    return render_template('404.html')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


@app.route('/audio_upload', methods=['POST'])
def upload_file():
    print('got upload request!')
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        file = request.files['file']
        # if user does not select file, browser also
        # submit a empty part without filename
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(path)
            sess = separation_session.SeparationSession.from_json(session['cur_session'])
            sess.initialize(path)
            return redirect(url_for('uploaded_file', filename=filename))
    return '''
        <!doctype html>
        <title>Upload new File</title>
        <h1>Upload new File</h1>
        <form action="" method=post enctype=multipart/form-data>
          <p><input type=file name=file>
             <input type=submit value=Upload>
        </form>
        '''


@app.route('/get_toy_data', methods=['GET'])
def send_toy_data():
    print('toy data')
    # print('nussl info: ' + nussl.__version__)
    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        path = os.path.join(basedir, 'tmp', 'audio', 'police_noisy.wav')
        if not sess.initialized:
            sess.initialize(path)

        start = int(request.args.get('start'))
        end = int(request.args.get('end'))
        police_json = sess.repet.get_beat_spectrum_json(start, end)
        # session['cur_session'] = sess.to_json()
        return police_json


@app.route('/get_spectrogram', methods=['GET'])
def send_spectrogram():
    print('spectrogram')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])

        if TOY:
            path = os.path.join(basedir, 'tmp', 'audio', 'police_noisy.wav')
            if not sess.initialized:
                sess.initialize(path)

        channel = 1 if 'channel' not in request.args else int(request.args.get('channel'))
        return sess.general.get_power_spectrogram_html(channel)


@app.route('/get_beat_spectrum', methods=['GET'])
def send_beat_spectrum():
    print('beat_spectrum')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        start = 0.0 if 'start' not in request.args else int(request.args.get('start'))
        end = sess.general.stft_end if 'end' not in request.args else int(request.args.get('end'))

        if TOY:
            path = os.path.join(basedir, 'tmp', 'audio', 'police_noisy.wav')
            if not sess.initialized:
                sess.initialize(path)

            start = 0.0
            end = sess.general.stft_end
        return sess.repet.get_beat_spectrum_html(start, end)


