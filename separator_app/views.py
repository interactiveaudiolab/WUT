import os
import logging
import inspect
import json

from flask import render_template, request, flash, redirect, url_for, session, abort, send_file, make_response
from werkzeug.utils import secure_filename

from separator_app import app
from separator_app import separation_session
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


def _get_args_float(args_dict):
    for k in args_dict.keys():
        if k in request.args and request.args.get(k):
            args_dict[k] = float(request.args.get(k))
    return args_dict


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

        # args = {'channel': None, 'start': None, 'stop': None, 'csv': None}

        # spec_mime_type = 'text/csv' if args['csv'] in (None, 0.0, 0, '') else 'text/json'
        spec_mime_type = 'text/csv'
        if WRITE_TMP_CSV:
            args = {'channel': None, 'start': None, 'stop': None, 'csv': True}
            args = _get_args_float(args)
            spec_file_path, freq_max = sess.user_general_audio.make_spectrogram_file(**args)

            response = make_response(send_file(spec_file_path, spec_mime_type))
        else:
            args = {'channel': None, 'start': None, 'stop': None}
            args = _get_args_float(args)
            strIO, file_name = sess.user_general_audio.get_spectrogram_csv_string(**args)
            response = make_response(send_file(strIO, spec_mime_type,
                                               attachment_filename=file_name, as_attachment=True))

        sess_json = sess.to_json()
        session['cur_session'] = sess_json
        # response.headers.add('freqMax', int(freq_max))

        return response

    return abort(405)


@app.route('/remove_all_but_selection', methods=['GET'])
def remove_all_but_selection():
    logger.info('in /remove_all_but_selection')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized or not sess.stft_done:
            _exception('sess not initialized or STFT not done!')

        args = {'xStart': None, 'xEnd': None, 'yStart': None, 'yEnd': None}
        args = _get_args_float(args)

        if not all(args.values()):
            _exception('Not all values set correctly! {}'.format(args))

        file_mime_type = 'audio/wav'
        file_path = sess.user_general_audio.make_wav_file_with_everything_but_selection(args['xStart'], args['xEnd'],
                                                                                        args['yStart'], args['yEnd'])
        sess_json = sess.to_json()

        session['cur_session'] = sess_json

        response = make_response(send_file(file_path, file_mime_type))

        return response


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

        response = make_response(send_file(file_path, file_mime_type))

        return response

