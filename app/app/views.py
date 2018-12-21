import os
import logging
import inspect
import json
from flask import (
    render_template,
    request,
    flash,
    session,
    abort,
    send_file,
    make_response,
)
from werkzeug.utils import secure_filename

from .audio_processing import DeepSeparationWrapper
from .app_obj import app_, socketio, redis_store
from .separation_session import SeparationSession
from .config import ALLOWED_EXTENSIONS
from .constants import FRONTEND_SEPARATION_CATEGORY_TO_BACKEND_MODEL

import sys

# FIXME: remove hack
sys.path.insert(0, "../experiments/code")
from trainer import Trainer

DEBUG = True

logger = logging.getLogger()
WUT_SOCKET_NAMESPACE = "/wut"


@app_.route("/")
@app_.route("/index")
def index():
    sess = SeparationSession()
    session["session_id"] = sess.url_safe_id
    session.modified = True
    save_session(sess)
    return render_template("index.html")


@app_.errorhandler(404)
def page_not_found(e):
    logger.warn(f"404! {request.full_path}")
    return render_template("404.html")


@socketio.on("connect", namespace=WUT_SOCKET_NAMESPACE)
def connected():
    logger.info("Socket connection established.")
    socketio.emit(
        "init response", {"data": "Connected"}, namespace=WUT_SOCKET_NAMESPACE
    )


@socketio.on("disconnect", namespace=WUT_SOCKET_NAMESPACE)
def disconnected():
    logger.info("Socket connection ended.")


@socketio.on("audio_upload", namespace=WUT_SOCKET_NAMESPACE)
def initialize(audio_file_data):
    logger.info("got upload request!")

    if not check_file_upload(audio_file_data):
        logger.warn("Got bad audio file!")
        socketio.emit("bad_file", namespace=WUT_SOCKET_NAMESPACE)
        return

    logger.info("File OKAY!")
    audio_file = audio_file_data["audio_file"]
    filename = secure_filename(audio_file["file_name"])

    sep_sess = awaken_session()

    path = os.path.join(sep_sess.user_original_file_folder, filename)
    # save file
    with open(path, "wb") as f:
        f.write(audio_file["file_data"])
    logger.info(f"{filename} saved at {path}")

    sep_sess.initialize(path)
    logger.info(
        f"Initialization successful for file {sep_sess.user_original_file_location}!"
    )
    save_session(sep_sess)
    socketio.emit("audio_upload_ok", namespace=WUT_SOCKET_NAMESPACE)

    # compute and send STFT, synchronously (STFT data needed for further calculations)
    logger.info(f"Computing spectrogram image for {filename}")
    sep_sess.user_general_audio.spectrogram_image()
    save_session(sep_sess)

    # compute and send Deep Clustering PCA visualization and mel spectrogram
    sep_sess.model_path = FRONTEND_SEPARATION_CATEGORY_TO_BACKEND_MODEL[
        audio_file_data["radio_selection"].lower()
    ]

    sep_sess.deep_separation_wrapper = DeepSeparationWrapper(
        sep_sess.user_signal,
        sep_sess.user_original_file_folder,
        model_path=sep_sess.model_path,
    )
    logger.info(f"Computing and sending clusters for {filename}")

    # FIXME: currently kind of ugly hack for mel spectrogram image
    underscored_file_name = sep_sess.user_general_audio.audio_signal_copy.file_name.replace(
        ".", "_"
    )
    file_name = f"{underscored_file_name}_mel_spec.png"
    file_path = os.path.join(sep_sess.user_general_audio.storage_path, file_name)

    logger.info(f"Saved spectrogram image @ {file_path}")

    sep_sess.user_general_audio.mel_spectrogram_image_path = file_path
    save_session(sep_sess)

    socketio.start_background_task(
        sep_sess.deep_separation_wrapper.send_separation,
        **{
            "socket": socketio,
            "namespace": WUT_SOCKET_NAMESPACE,
            "file_path": file_path,
        },
    )

    save_session(sep_sess)


def save_session(sep_sess):
    session_id = sep_sess.url_safe_id
    redis_store.set(session_id, sep_sess.to_json())


def awaken_session():
    return SeparationSession.from_json(redis_store.get(session["session_id"]))


def check_file_upload(audio_file_data):
    mixture_file_key = "audio_file"

    if mixture_file_key not in audio_file_data:
        flash("No file part")
        logger.warn("No file part!")

    audio_file = audio_file_data[mixture_file_key]

    if not audio_file:
        logger.warn("No selected file")
        return False

    # if user does not select file, browser also submit a empty part without filename
    if not audio_file["file_data"]:
        logger.warn("No selected file")
        return False

    return allowed_file(audio_file["file_name"])


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1] in ALLOWED_EXTENSIONS


def _exception(error_msg):
    frm = inspect.stack()[1][3]
    logger.error(f"{frm} -- {error_msg}")

    if DEBUG:
        raise Exception(error_msg)
    else:
        abort(500)


@app_.route("/mel_spec_image", methods=["GET"])
def mel_spectrogram_image():
    sess = awaken_session()

    if not sess.initialized:
        _exception("sess not initialized!")

    return send_file(
        sess.user_general_audio.mel_spectrogram_image_path, mimetype="image/png"
    )


@app_.route("/spec_image", methods=["GET"])
def spectrogram_image():
    sess = awaken_session()

    if not sess.initialized:
        _exception("sess not initialized!")

    return send_file(
        sess.user_general_audio.mel_spectrogram_image_path, mimetype="image/png"
    )


@socketio.on("retrain", namespace=WUT_SOCKET_NAMESPACE)
def retrain(mask):
    sess = awaken_session()
    model, _ = sess.deep_separation_wrapper.get_model_and_metadata()

    with open(
        os.path.expanduser("../experiments/code/config/defaults/train.json")
    ) as f:
        options = json.load(f)
    options["loss_function"] = [["dpcl", "embedding", "1.0"]]
    options["num_epochs"] = 1

    retrainer = Trainer(
        os.path.expanduser("~/.nussl/models/retrain"),
        sess.deep_separation_wrapper.build_annotation_dataset(mask["mask"]),
        model,
        options,
    )
    retrainer.fit()

    sess.deep_separation_wrapper.model_path = retrainer.save(
        False, os.path.expanduser("~/.tussl/models")
    )
    sess.deep_separation_wrapper.set_model(sess.deep_separation_wrapper.model_path)
    socketio.start_background_task(
        sess.deep_separation_wrapper.send_separation,
        **{"socket": socketio, "namespace": WUT_SOCKET_NAMESPACE},
    )


@socketio.on("mask", namespace=WUT_SOCKET_NAMESPACE)
def generate_mask(mask):
    sess = awaken_session()

    sess.deep_separation_wrapper.separate()
    mask = sess.deep_separation_wrapper.generate_mask_from_assignments(mask["mask"])
    masked = sess.deep_separation_wrapper.apply_mask(mask)
    inverse = sess.deep_separation_wrapper.apply_mask(mask.invert_mask())

    sess.masked_path = os.path.join(sess.user_original_file_folder, "masked.mp3")
    sess.inverse_path = os.path.join(sess.user_original_file_folder, "inverse.mp3")
    save_session(sess)
    masked.write_audio_to_file(sess.masked_path)
    inverse.write_audio_to_file(sess.inverse_path)
    socketio.emit("masked_audio", {}, namespace=WUT_SOCKET_NAMESPACE)
    socketio.emit("inverse_audio", {}, namespace=WUT_SOCKET_NAMESPACE)

    logger.info("told client to load masked & inverse audio")


@app_.route("/get_masked_audio", methods=["GET"])
def get_masked_audio():
    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception("sess not initialized or STFT not done!")

    save_session(sess)

    file_mime_type = "audio/mp3"
    return make_response(send_file(sess.masked_path, file_mime_type))


@app_.route("/get_inverse_audio", methods=["GET"])
def get_inverse_audio():
    sess = awaken_session()

    if not sess.initialized or not sess.stft_done:
        _exception("sess not initialized or STFT not done!")

    save_session(sess)

    # TODO: named argument here?
    file_mime_type = "audio/mp3"
    return make_response(send_file(sess.inverse_path, file_mime_type))
