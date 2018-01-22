import os
import logging
import inspect
import json

import numpy as np

from flask import render_template, request, flash, redirect, url_for, session, abort, send_file, make_response
from werkzeug.utils import secure_filename
from flask_socketio import emit

from .app_obj import app_, socketio
import separation_session
from config import ALLOWED_EXTENSIONS

DEBUG = True
WRITE_TMP_CSV = False


logger = logging.getLogger()

wut_namespace = '/wut'

@app_.route('/')
@app_.route('/index')
def index():
    new_sess = separation_session.SeparationSession()
    session['cur_session'] = new_sess.to_json()
    return render_template('index.html')


@app_.errorhandler(404)
def page_not_found(*args):
    logger.warn('404! {}'.format(request.full_path))
    return render_template('404.html')


@socketio.on('connect', namespace=wut_namespace)
def connected():
    logger.info('Socket connection established.')
    emit('init response', {'data': 'Connected'})


@socketio.on('disconnect', namespace=wut_namespace)
def disconnected():
    logger.info('Socket connection ended.')


@socketio.on('audio_upload', namespace=wut_namespace)
def initialize(audio_file_data):
    logger.info('got upload request!')
    mixture_file_key = 'audio_file'

    if mixture_file_key not in audio_file_data:
        flash('No file part')
        logger.warn('No file part!')

    audio_file = audio_file_data[mixture_file_key]

    if not audio_file:
        logger.warn('No selected file')
        return

    # if user does not select file, browser also submit a empty part without filename
    if not audio_file['file_data']:
        flash('No selected file')
        logger.warn('No selected file')
        return

    if allowed_file(audio_file['file_name']):

        # The file is OKAY
        logger.info('File OKAY!')
        filename = secure_filename(audio_file['file_name'])

        # Retrieve the session from memory
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        path = os.path.join(sess.user_original_file_folder, filename)
        logger.info('Saving at {}'.format(path))

        # Save the file
        with open(path, 'wb') as f:
            f.write(audio_file['file_data'])

        # Initialize the session
        sess.initialize(path)
        socketio.emit('audio_upload_ok', namespace=wut_namespace)

        # Compute and send the STFT
        spec_json = sess.user_general_audio.get_spectrogram_json()
        socketio.emit('spectrogram', {'spectrogram': spec_json}, namespace=wut_namespace)

        # Compute and send the 2DFT
        ft2d_json = sess.ft2d.get_2dft_json()
        socketio.emit('ft2d', {'ft2d': ft2d_json}, namespace=wut_namespace)

        # Compute and send the AD histogram
        ad_hist_json = sess.duet.get_ad_histogram_json()
        socketio.emit('ad_hist', {'ad_hist': ad_hist_json}, namespace=wut_namespace)

        session['cur_session'] = sess.to_json()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


def _exception(error_msg):
    frm = inspect.stack()[1][3]
    logger.error('{} -- {}'.format(frm, error_msg))

    if DEBUG:
        raise Exception(error_msg)
    else:
        abort(404)


@app_.route('/spec_image', methods=['GET'])
def spectrogram_image():
    logger.info('in /spec_image')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized:
            _exception('sess not initialized!')

        file_name = sess.user_general_audio.spectrogram_image()

        session['cur_session'] = sess.to_json()
        return send_file(file_name, mimetype='image/png')


@app_.route('/reqs', methods=['GET'])
def recommendations():
    logger.info('Sending recommendations')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized:
            _exception('sess not initialized')

        sig_length = sess.user_general_audio.audio_signal.signal_duration
        num_segments = 5
        offset = 0.5

        reqs = []
        for i, val in enumerate(np.linspace(0.0, sig_length, num_segments, endpoint=False)):
            if i % 2 == 0:
                reqs.append({'type': 'duet', 'time': {'start': val, 'end': val + offset + np.random.rand()}})
            else:
                reqs.append({'type': 'ft2d', 'time': {'start': val, 'end': val + offset + np.random.rand()}})

        return json.dumps(reqs)
    return abort(405)


@app_.route('/survey_results', methods=['POST'])
def survey_results():
    logger.info('Getting survey results')

    if request.method == 'POST':
        survey_results = request.json['survey_data']

        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))
        sess.save_survey_data(survey_results)

        session['cur_session'] = sess.to_json()

        return json.dumps(True)


@app_.route('/action', methods=['POST'])
def action():
    logger.info('receiving action')

    if request.method == 'POST':
        action_dict = request.json['actionData']
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized or not sess.stft_done:
            _exception('sess not initialized or STFT not done!')

        sess.push_action(action_dict)
        session['cur_session'] = sess.to_json()

        return json.dumps(True)


@app_.route('/process', methods=['GET'])
def process():
    logger.info('got process request!')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized or not sess.stft_done:
            _exception('sess not initialized or STFT not done!')

        sess.apply_actions_in_queue()

        file_mime_type = 'audio/wav'
        file_path = sess.user_general_audio.make_wav_file()

        session['cur_session'] = sess.to_json()

        response = make_response(send_file(file_path, file_mime_type))

        return response

