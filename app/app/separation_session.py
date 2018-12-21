import base64
import copy
import logging
import os
import uuid
import jsonpickle

# for serializing numpy values - https://jsonpickle.github.io/extensions.html
import jsonpickle.ext.numpy as jsonpickle_numpy

from .audio_processing import GeneralAudio
from .config import USER_AUDIO_FOLDER, USER_AUDIO_ORIGINAL_FOLDER_NAME
from . import utils

# FIXME: remove hack
import sys

sys.path.insert(0, "../nussl")

import nussl

# set up logging
logger = logging.getLogger()

jsonpickle_numpy.register_handlers()


class SeparationSession(object):
    """Object for a single session, handles everything"""

    def __init__(self, from_json: bool = False):
        """Constructs a SeparationSession, optionally from json"""

        self.session_id = None
        self.base_audio_path = None
        self.user_original_file_folder = None
        self.deep_separation_wrapper = None

        if not from_json:
            # set up a session ID and store it
            self.session_id = uuid.uuid4()

            # set up folders
            self.base_audio_path = USER_AUDIO_FOLDER
            self.user_original_file_folder = os.path.join(
                self.base_audio_path, self.url_safe_id, USER_AUDIO_ORIGINAL_FOLDER_NAME
            )
            utils.safe_makedirs(self.user_original_file_folder)

            logger.info(f"New session ready! - {self.url_safe_id}")

        self.user_original_file_location = None
        self.user_general_audio = None
        self.user_signal = None
        self.masked_path = None
        self.inverse_path = None

        self.initialized = False

    @property
    def url_safe_id(self):
        # 22 chars long (last two chars are '==')
        return str(base64.urlsafe_b64encode(self.session_id.bytes)[:22])

    @property
    def stft_done(self):
        return self.user_general_audio and self.user_general_audio.stft_done

    def initialize(self, path_to_file):
        if not os.path.isfile(path_to_file):
            raise Exception(f"File path not a file! - {path_to_file}")

        self.user_original_file_location = path_to_file

        self.user_signal = nussl.AudioSignal(self.user_original_file_location)
        self.user_general_audio = GeneralAudio(
            self.user_signal, self.user_original_file_folder
        )

        self.initialized = True
        return self.user_signal

    def to_json(self):
        # TODO: remove hack here
        # TODO: avoid deepcopy? surprisingly not as slow as I would have thought
        # TODO: use byte stream?
        # https://pytorch.org/docs/stable/torch.html?highlight=save#torch.save
        sess = copy.deepcopy(self)
        if sess.deep_separation_wrapper:
            sess.deep_separation_wrapper._deep_separation.model = None
        return jsonpickle.encode(sess)

    @staticmethod
    def from_json(json_string):
        sess = jsonpickle.decode(json_string)

        # TODO: remove hack here too
        if sess.deep_separation_wrapper:
            sess.deep_separation_wrapper.set_model(
                sess.deep_separation_wrapper.model_path
            )
        return sess
