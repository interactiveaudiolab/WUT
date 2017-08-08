import os
import logging

from flask import render_template, request, flash, redirect, url_for, session, abort, send_file
from werkzeug.utils import secure_filename

from separator_app import app
from separator_app import separation_session
from config import ALLOWED_EXTENSIONS


logger = logging.getLogger()


@app.route('/')
@app.route('/index')
def index():
    new_sess = separation_session.SeparationSession()
    session['cur_session'] = new_sess.to_json()

    return render_template('index.html')
    # return render_template('bokeh_index.html')


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


# @app.route('/get_toy_data', methods=['GET'])
# def send_toy_data():
#     print('toy data')
#     # print('nussl info: ' + nussl.__version__)
#     if request.method == 'GET':
#         # sess = separation_session.SeparationSession.from_json(session['cur_session'])
#         path = os.path.join(basedir, 'tmp', 'toy_audio', 'police_noisy.wav')
#         # if not sess.initialized:
#         #     sess.initialize(path)
#
#         start = int(request.args.get('start'))
#         end = int(request.args.get('end'))
#         # police_json = sess.repet.get_beat_spectrum_json(start, end)
#         # session['cur_session'] = sess.to_json()
#         # return police_json

def _update_session():
    pass


@app.route('/get_spectrogram', methods=['GET'])
def send_spectrogram():
    logger.info('in /get_spectrogram')

    if request.method == 'GET':
        sess = separation_session.SeparationSession.from_json(session['cur_session'])
        logger.info('session awake {}'.format(sess.session_id))

        if not sess.initialized:
            abort(404)

        args = {'channel': None, 'start': None, 'stop': None}

        for k in args.keys():
            if k in request.args and request.args.get(k):
                args[k] = float(request.args.get(k))

        csv_file_path = sess.user_general_audio.get_spectrogram_csv_file(**args)

        return send_file(csv_file_path, 'text/csv')

    return abort(405)


# @app.route('/get_beat_spectrum', methods=['GET'])
# def send_beat_spectrum():
#     print('beat_spectrum')
#
#     if request.method == 'GET':
#         # sess = separation_session.SeparationSession.from_json(session['cur_session'])
#         pass
