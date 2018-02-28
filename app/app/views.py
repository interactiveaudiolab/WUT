import os
import logging
import inspect
import json
import math
import audio_processing
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

import numpy as np

from flask import render_template, request, flash, session, abort, send_file, make_response
from werkzeug.utils import secure_filename
from flask_socketio import emit
from pickle import Unpickler

from .app_obj import app_, socketio, redis_store
import separation_session
from config import ALLOWED_EXTENSIONS

DEBUG = True

logger = logging.getLogger()
WUT_SOCKET_NAMESPACE = '/wut'
CURRENT_SESSION = 'cur_session'


@app_.route('/')
@app_.route('/index')
def index():
    separation_sess = separation_session.SeparationSession()
    session['session_id'] = separation_sess.url_safe_id
    session.modified = True
    save_session(separation_sess)
    return render_template('index.html', target_dict=separation_sess.target_name_dict)

@app_.route('/test')
def test():
    new_sess = separation_session.SeparationSession()
    session['session_id'] = new_sess.url_safe_id
    session.modified = True
    save_session(new_sess)
    return render_template('test.html')

@app_.errorhandler(404)
def page_not_found(e):
    logger.warn('404! {}'.format(request.full_path))
    return render_template('404.html')


@socketio.on('connect', namespace=WUT_SOCKET_NAMESPACE)
def connected():
    logger.info('Socket connection established.')
    socketio.emit('init response', {'data': 'Connected'}, namespace=WUT_SOCKET_NAMESPACE)


@socketio.on('disconnect', namespace=WUT_SOCKET_NAMESPACE)
def disconnected():
    logger.info('Socket connection ended.')


@socketio.on('audio_upload', namespace=WUT_SOCKET_NAMESPACE)
def initialize(audio_file_data):
    logger.info('got upload request!')

    if not check_file_upload(audio_file_data):
        logger.warn('Got bad audio file!')
        socketio.emit('bad_file', namespace=WUT_SOCKET_NAMESPACE)
        return

    # The file is OKAY
    logger.info('File OKAY!')
    audio_file = audio_file_data['audio_file']
    filename = secure_filename(audio_file['file_name'])

    # Retrieve the session from memory
    separation_sess = awaken_session()
    path = os.path.join(separation_sess.user_original_file_folder, filename)
    logger.info('Saving at {}'.format(path))

    # Save the file
    with open(path, 'wb') as f:
        f.write(audio_file['file_data'])
    logger.info('{} saved at {}'.format(filename, path))

    # Initialize the session
    logger.info('Initializing session for {}...'.format(filename))
    user_signal = separation_sess.initialize(path)
    logger.info('Initialization successful for file {}!'.format(separation_sess.user_original_file_location))
    save_session(separation_sess)
    socketio.emit('audio_upload_ok', namespace=WUT_SOCKET_NAMESPACE)

    # Compute and send the STFT, Synchronously (STFT data is needed for further calculations)
    logger.info('Computing spectrogram image for {}'.format(filename))
    separation_sess.user_general_audio.spectrogram_image()
    logger.info('Sent spectrogram image info for {}'.format(filename))
    save_session(separation_sess)
    socketio.emit('spectrogram_image_ready', {'max_freq': separation_sess.user_general_audio.max_frequency_displayed},
                  namespace=WUT_SOCKET_NAMESPACE)

    # logger.info('Sent spectrogram for {}'.format(filename))

    # Initialize other representations

    # Compute and send Deep Clustering PCA visualization and mel spectrogram
    dc = audio_processing.DeepClustering(user_signal, separation_sess.user_original_file_folder)
    logger.info('Computing and sending clusters for {}'.format(filename))

    # currently kind of ugly hack for mel spectrogram image
    file_name = '{}_spec.png'.format(separation_sess.user_general_audio.audio_signal_copy.file_name.replace('.', '_'))
    file_path = os.path.join(separation_sess.user_general_audio.storage_path, file_name)
    separation_sess.user_general_audio.spectrogram_image_path = file_path

    socketio.start_background_task(dc.send_deep_clustering_results,
        **{ 'socket': socketio, 'namespace': WUT_SOCKET_NAMESPACE,
            'file_path': file_path })

    # Compute and send the AD histogram, Asynchronously
    logger.info('Computing and sending AD histogram for {}'.format(filename))
    socketio.start_background_task(separation_sess.duet.send_ad_histogram_json,
                                   **{'socket': socketio, 'namespace': WUT_SOCKET_NAMESPACE})
    # Save the session
    save_session(separation_sess)


def save_session(separation_sess):
    session_id = separation_sess.url_safe_id
    redis_store.set(session_id, separation_sess.to_json())


def awaken_session():
    separation_sess = redis_store.get(session['session_id'])
    separation_sess = separation_session.SeparationSession.from_json(separation_sess)
    logger.info('session awake {}'.format(separation_sess.session_id))
    return separation_sess


def check_file_upload(audio_file_data):
    mixture_file_key = 'audio_file'

    if mixture_file_key not in audio_file_data:
        flash('No file part')
        logger.warn('No file part!')

    audio_file = audio_file_data[mixture_file_key]

    if not audio_file:
        logger.warn('No selected file')
        return False

    # if user does not select file, browser also submit a empty part without filename
    if not audio_file['file_data']:
        logger.warn('No selected file')
        return False

    return allowed_file(audio_file['file_name'])


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


def _exception(error_msg):
    frm = inspect.stack()[1][3]
    logger.error('{} -- {}'.format(frm, error_msg))

    if DEBUG:
        raise Exception(error_msg)
    else:
        abort(500)

@app_.route('/mel_spec_image', methods=['GET'])
def mel_spectrogram_image():
    logger.info('in /mel_spec_image')

    if request.method == 'GET':
        sess = awaken_session()
        # path = save_mel_image(spec_data, os.path.join(spec_data, sess.user_original_file_folder, 'test_mel.png'))
        return send_file(sess.user_general_audio.spectrogram_image_path, mimetype='image/png')

@app_.route('/spec_image', methods=['GET'])
def spectrogram_image():
    logger.info('in /spec_image')

    sess = awaken_session()

    if not sess.initialized:
        _exception('sess not initialized!')

    logger.info('Sending spectrogram file.')
    return send_file(sess.user_general_audio.spectrogram_image_path, mimetype='image/png')


@socketio.on('survey_results', namespace=WUT_SOCKET_NAMESPACE)
def get_survey_results(message):
    logger.info('Getting survey results')

    sess = awaken_session()
    sess.receive_survey_response(message)
    save_session(sess)


@socketio.on('get_recommendations', namespace=WUT_SOCKET_NAMESPACE)
def send_recommendations(message):

    sess = awaken_session()
    reqs = sess.sdr_predictor.dummy_recommendations()
    algorithm = message['algorithm']
    save_session(sess)

    logger.info('Sending recommendation data for {}.'.format(algorithm))

    socketio.emit('envelope_data', {'envelopeData': reqs[algorithm], 'algorithm': algorithm},
                  namespace=WUT_SOCKET_NAMESPACE)


@app_.route('/separated_source_demo', methods=['GET'])
def get_separated_source():
    logger.info('getting separated source')

    # sess = awaken_session()
    #
    # if not sess.initialized:
    #     _exception('sess not initialized!')

    if 'method' not in request.args:
        separation_method = 'repet_sim'
    else:
        separation_method = request.args.get('method')

    # send_recommendations(separation_method)

    mime_type = 'audio/mp3'
    base_path = '/Users/ethanmanilow/Documents/School/Research/audio_representations/website/backend/output/'

    if separation_method == 'repet_sim':
        logger.info('Sending Repet!')
        return send_file(os.path.join(base_path, 'repet_fg.mp3'), mimetype=mime_type)

    elif separation_method == 'projet':
        logger.info('Sending Projet!')
        return send_file(os.path.join(base_path, 'proj_1.mp3'), mimetype=mime_type)

    elif separation_method == 'melodia':
        logger.info('Sending Melodia!')
        return send_file(os.path.join(base_path, 'mel_fg.mp3'), mimetype=mime_type)


@socketio.on('action', namespace=WUT_SOCKET_NAMESPACE)
def get_action(action_):
    logger.info('receiving action')

    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception('sess not initialized or STFT not done!')

    action_dict = action_['actionData']
    sess.push_action(action_dict)
    save_session(sess)


@app_.route('/action', methods=['POST'])
def action():
    logger.info('receiving action')

    action_dict = request.json['actionData']
    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception('sess not initialized or STFT not done!')

    sess.push_action(action_dict)
    save_session(sess)

    return json.dumps(True)


@app_.route('/process', methods=['GET'])
def process():
    logger.info('got process request!')

    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception('sess not initialized or STFT not done!')

    sess.apply_actions_in_queue()
    save_session(sess)

    file_mime_type = 'audio/wav'
    file_path = sess.user_general_audio.make_wav_file()

    return make_response(send_file(file_path, file_mime_type))
