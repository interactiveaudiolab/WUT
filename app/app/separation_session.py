# coding=utf-8
"""

"""
import base64
import copy
import json
import logging
import os
import time
import uuid
from collections import deque

import jsonpickle
import jsonpickle.ext.numpy as jsonpickle_numpy

from . import audio_processing
from . import config
from . import utils

from pickle import Unpickler


import sys

sys.path.insert(0, '../nussl')

import nussl

# Set up logging
logger = logging.getLogger()

jsonpickle_numpy.register_handlers()


class SeparationSession(object):
    """
    Object for a single session, handles everything
    """

    _file_ext_that_need_converting = ['mp3', 'flac']

    def __init__(self, from_json=False):
        """

        """

        self.session_id = None
        self.base_audio_path = None
        self.user_original_file_folder = None
        self.time_of_birth = time.asctime(time.localtime(time.time()))
        self.time_of_init = None
        self.user_goals = []
        self.deep_separation_wrapper = None

        if not from_json:
            # Set up a session ID and store it
            self.session_id = uuid.uuid4()

            # Set up folders
            self.base_audio_path = config.USER_AUDIO_FOLDER
            self.user_original_file_folder = os.path.join(
                self.base_audio_path,
                self.url_safe_id,
                config.USER_AUDIO_ORIGINAL_FOLDER_NAME,
            )
            utils.safe_makedirs(self.user_original_file_folder)

            logger.info('New session ready! - {}'.format(self.url_safe_id))

        self.user_original_file_location = None
        self.user_general_audio = None
        self.user_signal = None
        self.masked_path = None
        self.inverse_path = None

        self.undo_list = []
        self.initialized = False

    @property
    def url_safe_id(self):
        # 22 chars long (last two chars are '==')
        return str(base64.urlsafe_b64encode(self.session_id.bytes)[:22])

    @property
    def stft_done(self):
        if self.user_general_audio is None:
            return False

        return self.user_general_audio.stft_done

    def initialize(self, path_to_file):
        if not os.path.isfile(path_to_file):
            raise Exception('File path not a file! - {}'.format(path_to_file))

        self.user_original_file_location = path_to_file

        self.user_signal = nussl.AudioSignal(self.user_original_file_location)
        self.user_general_audio = audio_processing.GeneralAudio(
            self.user_signal, self.user_original_file_folder
        )

        self.initialized = True
        self.time_of_init = time.asctime(time.localtime(time.time()))
        return self.user_signal

    def receive_survey_response(self, survey_data):
        self.user_goals = survey_data['extraction_goals']

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
