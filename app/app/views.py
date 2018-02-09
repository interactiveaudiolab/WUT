import os
import logging
import inspect
import json

import numpy as np

from flask import render_template, request, flash, session, abort, send_file, make_response
from werkzeug.utils import secure_filename

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
    separation_sess.initialize(path)
    socketio.emit('audio_upload_ok', namespace=WUT_SOCKET_NAMESPACE)
    logger.info('Initialization successful for file {}!'.format(separation_sess.user_original_file_location))
    save_session(separation_sess)

    # Compute and send the STFT, Synchronously (STFT data is needed for further calculations)
    logger.info('Computing spectrogram image for {}'.format(filename))
    separation_sess.user_general_audio.spectrogram_image()
    socketio.emit('spectrogram_image_ready', {'max_freq': separation_sess.user_general_audio.max_frequency_displayed},
                  namespace=WUT_SOCKET_NAMESPACE)
    logger.info('Sent spectrogram image info for {}'.format(filename))
    save_session(separation_sess)

    # Initialize other representations
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


@app_.route('/spec_image', methods=['GET'])
def spectrogram_image():
    logger.info('in /spec_image')

    sess = awaken_session()

    if not sess.initialized:
        _exception('sess not initialized!')

    logger.info('Sending spectrogram file.')
    return send_file(sess.user_general_audio.spectrogram_image_path, mimetype='image/png')


@socketio.on('recommendations', namespace=WUT_SOCKET_NAMESPACE)
def recommendations():
    logger.info('Sending recommendations')

    sess = awaken_session()


@app_.route('/reqs', methods=['GET'])
def recommendations():
    logger.info('Sending recommendations')

    sess = awaken_session()

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


@app_.route('/survey_results', methods=['POST'])
def survey_results():
    logger.info('Getting survey results')

    results = request.json['survey_data']
    sess = awaken_session()
    sess.save_survey_data(results)
    save_session(sess)

    return json.dumps(True)


@socketio.on('survey_results', namespace=WUT_SOCKET_NAMESPACE)
def get_survey_results(message):
    logger.info('Getting survey results')

    sess = awaken_session()
    sess.save_survey_data(message['survey_data'])
    save_session(sess)


@socketio.on('action', namespace=WUT_SOCKET_NAMESPACE)
def get_action(action):
    logger.info('receiving action')

    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception('sess not initialized or STFT not done!')

    action_dict = action['actionData']
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
