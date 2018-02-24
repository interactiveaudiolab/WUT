import os
import logging
import inspect
import json
import math
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
    separation_sess.initialize(path)
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

    logger.info('About to unpickle')
    data = Unpickler(open('./app/toy_data.p')).load()

    logger.info('About to send spectrogram')

    def scale_num(num, _min, _max, scaled_min, scaled_max):
        return (((scaled_max - scaled_min) * (num - _min)) / (_max - _min)) + scaled_min

    def clean_coordinates(coord, x_edges, y_edges, new_max = 99, new_min = 0):
        return (int(round(scale_num(coord[0], x_edges[0], x_edges[1], new_min, new_max))),
            int(round(scale_num(coord[1], y_edges[0], y_edges[1], new_min, new_max))))

    def find_pca_min_max(pca):
        mins = np.amin(pca, 0)
        maxes = np.amax(pca, 0)
        return (mins[0], maxes[0]), (mins[1], maxes[1])

    def scale_pca(pca, new_max=99, new_min = 0):
        x_edges, y_edges = find_pca_min_max(pca)

        scale_and_clean = lambda coord: clean_coordinates(coord, x_edges, y_edges, new_max, new_min)
        return np.apply_along_axis(scale_and_clean, 1, pca)

    def make_square_matrix(dim=100):
        return [[[] for x in range(dim)] for y in range(dim)]

    def bin_matrix(scaled_tf, matrix):
        # come back to this
        # don't know why but x and y need to be swapped here
        for index, (y, x) in enumerate(scaled_tf):
            matrix[x][y].append(index)

        return matrix

    def make_hist(matrix):
        for x in range(len(matrix)):
            for y in range(len(matrix[0])):
                matrix[x][y] = np.log(len(matrix[x][y]) + 0.00000000000000001)

        return matrix

    dim = 99
    scaled = scale_pca(data['pca'], dim)
    binned = bin_matrix(scaled, make_square_matrix(dim + 1))

    socketio.emit('pca', json.dumps(binned), namespace=WUT_SOCKET_NAMESPACE)
    socketio.emit('spec', json.dumps(data['mel_spectrogram'][0].T.tolist()), namespace=WUT_SOCKET_NAMESPACE)

    logger.info('Sent spectrogram')

    # logger.info('Sent spectrogram for {}'.format(filename))

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

def save_image(data, file_path):
    # spec = self.do_spectrogram()
    # spectrogram data here - REMOVE THIS LATER
    spec = data
    # max_idx = self.find_peak_freq()
    # spec = spec[:max_idx, :]

    w, h = 28, 12

    fig = plt.figure(frameon=False)
    fig.set_size_inches(w, h)

    ax = plt.Axes(fig, [0., 0., 1., 1.])
    ax.set_axis_off()
    fig.add_axes(ax)

    img = ax.imshow(spec, interpolation='nearest', aspect='auto')
    img.set_cmap('plasma')
    ax.invert_yaxis()
    fig.savefig(file_path, dpi=80)

    return file_path


@app_.route('/mel_spec_image', methods=['GET'])
def mel_spectrogram_image():
    logger.info('in /mel_spec_image')

    if request.method == 'GET':
        # sess = separation_session.SeparationSession.from_json(session['cur_session'])
        # logger.info('session awake {}'.format(sess.session_id))

        # if not sess.initialized:
        #     _exception('sess not initialized!')

        # path = sess.spectrogram_image_path

        ### TODO: Remove the kludge of having it as a url parameter!!!
        # path = request.args.get('path', default='', type=str)


        data = Unpickler(open('./app/toy_data.p')).load()
        spec_data = data['mel_spectrogram'][0].T
        sess = awaken_session()
        path = save_image(spec_data, os.path.join(spec_data, sess.user_original_file_folder, 'test_mel.png'))
        return send_file(path, mimetype='image/png')

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
