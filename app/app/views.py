import os
import logging
import inspect
import json

import numpy as np

from flask import render_template, request, flash, redirect, url_for, session, abort, send_file, make_response
from werkzeug.utils import secure_filename

from .main import app
import separation_session
from config import ALLOWED_EXTENSIONS

DEBUG = True
WRITE_TMP_CSV = False


logger = logging.getLogger()


@app.route('/')
@app.route('/index')
def index():
    new_sess = separation_session.SeparationSession()
    session['cur_session'] = new_sess.to_json()
    return render_template('index.html')


@app.errorhandler(404)
def page_not_found(*args):
    logger.warn('404! {}'.format(request.full_path))
    return render_template('404.html')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


@app.route('/audio_upload', methods=['GET', 'POST'])
def upload_file():
    logger.info('got upload request!')
    mixture_file_key = 'audio_file'

    if request.method == 'POST':
        # check if the post request has the file part
        if mixture_file_key not in request.files:
            flash('No file part')
            logger.warn('No file part!')
            return redirect(request.url)

        this_file = request.files[mixture_file_key]

        # if user does not select file, browser also
        # submit a empty part without filename
        if this_file.filename == '':
            flash('No selected file')
            logger.warn('No selected file')
            return redirect(request.url)

        if this_file and allowed_file(this_file.filename):
            logger.info('File OKAY!')
            filename = secure_filename(this_file.filename)

            sess = separation_session.SeparationSession.from_json(session['cur_session'])
            path = os.path.join(sess.user_original_file_folder, filename)
            logger.info('Saving at {}'.format(path))
            this_file.save(path)
            sess.initialize(path)

            sess_json = sess.to_json()

            session['cur_session'] = sess_json

            return redirect(url_for('upload_file', filename=filename))

    return '''
        <!doctype html>
        <title>Upload new File</title>
        <h1>Upload new File</h1>
        <form action="" method=post enctype=multipart/form-data>
          <p><input type=file name=file>
             <input type=submit value=Upload>
        </form>
        '''


def _exception(error_msg):
    frm = inspect.stack()[1][3]
    logger.error('{} -- {}'.format(frm, error_msg))

    if DEBUG:
        raise Exception(error_msg)
    else:
        abort(404)


@app.route('/get_spectrogram', methods=['GET'])
def send_spectrogram():
    logger.info('in /get_spectrogram')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized:
            _exception('sess not initialized!')

        get_result = False
        if 'result' in request.args and request.args.get('result'):
            get_result = bool(request.args.get('result'))

        spec_mime_type = 'text/csv'
        strIO, file_name = sess.user_general_audio.get_spectrogram_csv_string(get_result=get_result)
        response = make_response(send_file(strIO, spec_mime_type,
                                           attachment_filename=file_name, as_attachment=True))

        sess_json = sess.to_json()
        session['cur_session'] = sess_json
        # response.headers.add('freqMax', int(freq_max))

        return response

    return abort(405)


@app.route('/get_2dft', methods=['GET'])
def get_2dft():
    logger.info('getting 2DFT')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized or not sess.stft_done:
            _exception('sess not initialized or STFT not done!')

        spec_mime_type = 'text/csv'
        strIO, file_name = sess.ft2d.get_2dft_csv_string()
        response = make_response(send_file(strIO, spec_mime_type,
                                           attachment_filename=file_name, as_attachment=True))

        sess_json = sess.to_json()
        session['cur_session'] = sess_json
        return response
    return abort(405)


@app.route('/get_atn_delay_hist', methods=['GET'])
def get_atn_delay_hist():
    logger.info('getting attenuation/delay histogram')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized or not sess.stft_done:
            _exception('sess not initialized or STFT not done!')

        spec_mime_type = 'text/csv'
        strIO, file_name = sess.duet.get_ad_histogram_csv_string()
        response = make_response(send_file(strIO, spec_mime_type,
                                           attachment_filename=file_name, as_attachment=True))

        sess_json = sess.to_json()
        session['cur_session'] = sess_json
        return response
    return abort(405)


@app.route('/reqs', methods=['GET'])
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


@app.route('/survey_results', methods=['POST'])
def survey_results():
    logger.info('Getting survey results')

    if request.method == 'POST':
        survey_results = request.json['survey_data']

        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))
        sess.save_survey_data(survey_results)

        session['cur_session'] = sess.to_json()

        return json.dumps(True)


@app.route('/action', methods=['POST'])
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


@app.route('/process', methods=['GET'])
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

