import os
import logging
import inspect
import json
import math
from . import audio_processing
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

import numpy as np
from . import utils
from flask import render_template, request, flash, session, abort, send_file, make_response
from werkzeug.utils import secure_filename
from flask_socketio import emit
from pickle import Unpickler

from .app_obj import app_, socketio, redis_store
from . import separation_session
from .config import ALLOWED_EXTENSIONS

DEBUG = True

logger = logging.getLogger()
WUT_SOCKET_NAMESPACE = '/wut'
CURRENT_SESSION = 'cur_session'


HOME = os.path.abspath('../../models')

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


@app_.route('/study')
def study():
    new_sess = separation_session.SeparationSession()
    session['session_id'] = new_sess.url_safe_id
    session.modified = True
    save_session(new_sess)
    return render_template('study.html')


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
    # Save the file
    with open(path, 'wb') as f:
        f.write(audio_file['file_data'])
    logger.info('{} saved at {}'.format(filename, path))

    # Initialize the session
    separation_sess.initialize(path)
    logger.info('Initialization successful for file {}!'
                .format(separation_sess.user_original_file_location))
    save_session(separation_sess)
    socketio.emit('audio_upload_ok', namespace=WUT_SOCKET_NAMESPACE)

    # Compute and send the STFT, Synchronously (STFT data is needed for further calculations)
    logger.info('Computing spectrogram image for {}'.format(filename))
    separation_sess.user_general_audio.spectrogram_image()
    save_session(separation_sess)

    # compute and send Deep Clustering PCA visualization and mel spectrogram
    separation_sess.model_type = audio_file_data['radio_selection']
    deep_separation_wrapper = audio_processing.DeepSeparationWrapper(
        separation_sess.user_signal,
        separation_sess.user_original_file_folder,
    )
    logger.info('Computing and sending clusters for {}'.format(filename))

    # currently kind of ugly hack for mel spectrogram image
    underscored_file_name = (
        separation_sess
            .user_general_audio
            .audio_signal_copy
            .file_name
            .replace('.', '_')
    )
    file_name = f'{underscored_file_name}_mel_spec.png'
    file_path = os.path.join(
        separation_sess.user_general_audio.storage_path,
        file_name
    )

    logger.info(f'Saved spectrogram image @ {file_path}')

    separation_sess.user_general_audio.mel_spectrogram_image_path = file_path
    save_session(separation_sess)

    socketio.start_background_task(
        deep_separation_wrapper.send_separation,
        **{
            'socket': socketio,
            'namespace': WUT_SOCKET_NAMESPACE,
            'file_path': file_path,
        },
    )

    # Save the session
    save_session(separation_sess)


def save_session(separation_sess):
    session_id = separation_sess.url_safe_id
    redis_store.set(session_id, separation_sess.to_json())


def awaken_session():
    separation_sess = redis_store.get(session['session_id'])
    separation_sess = separation_session.SeparationSession.from_json(separation_sess)
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

    sess = awaken_session()

    if not sess.initialized:
        _exception('sess not initialized!')

    logger.info(sess.user_general_audio.mel_spectrogram_image_path)
    return send_file(sess.user_general_audio.mel_spectrogram_image_path, mimetype='image/png')

@app_.route('/spec_image', methods=['GET'])
def spectrogram_image():
    logger.info('in /spec_image')

    sess = awaken_session()

    if not sess.initialized:
        _exception('sess not initialized!')

    logger.info('Sending spectrogram file.')
    logger.info(sess.user_general_audio.mel_spectrogram_image_path)
    return send_file(sess.user_general_audio.mel_spectrogram_image_path, mimetype='image/png')


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


@socketio.on('action', namespace=WUT_SOCKET_NAMESPACE)
def get_action(action_):
    logger.info('receiving action')

    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception('sess not initialized or STFT not done!')

    action_dict = action_['actionData']
    sess.push_action(action_dict)
    save_session(sess)

@socketio.on('mask', namespace=WUT_SOCKET_NAMESPACE)
def generate_mask(mask):
    sess = awaken_session()
    deep_separation_wrapper = audio_processing.DeepSeparationWrapper(
        sess.user_signal,
        sess.user_original_file_folder,
    )

    deep_separation_wrapper.separate()
    mask = deep_separation_wrapper.generate_mask_from_assignments(mask['mask'])
    masked = deep_separation_wrapper.apply_mask(mask)
    inverse = deep_separation_wrapper.apply_mask(mask.invert_mask())

    sess.masked_path = os.path.join(
        sess.user_original_file_folder,
        'masked.mp3'
    )
    sess.inverse_path = os.path.join(
        sess.user_original_file_folder,
        'inverse.mp3'
    )
    save_session(sess)
    masked.write_audio_to_file(sess.masked_path)
    inverse.write_audio_to_file(sess.inverse_path)
    socketio.emit('masked_audio', {}, namespace=WUT_SOCKET_NAMESPACE)
    socketio.emit('inverse_audio', {}, namespace=WUT_SOCKET_NAMESPACE)

    logger.info('told client to load masked & inverse audio')

@app_.route('/get_masked_audio', methods=['GET'])
def get_masked_audio():
    logger.info('sending masked audio')

    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception('sess not initialized or STFT not done!')

    save_session(sess)

    file_mime_type = 'audio/mp3'
    return make_response(send_file(sess.masked_path, file_mime_type))

@app_.route('/get_inverse_audio', methods=['GET'])
def get_inverse_audio():
    logger.info('sending inverse audio')

    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception('sess not initialized or STFT not done!')

    save_session(sess)

    file_mime_type = 'audio/mp3'
    return make_response(send_file(sess.inverse_path, file_mime_type))

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
