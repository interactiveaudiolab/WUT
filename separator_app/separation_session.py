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

import numpy as np

import audio_processing
import config
import nussl
import actions
import utils

# Set up logging
# logger = logging.getLogger(__name__)
logger = logging.getLogger()


class SeparationSession(object):
    """
    Object for a single session, handles
    """
    _needs_special_encoding = ['user_general_audio']
    _file_ext_that_need_converting = ['mp3', 'flac']

    def __init__(self, from_json=False):
        """

        """
        # super(JSONEncoder, self).__init__()

        self.session_id = None
        self.base_audio_path = None
        self.user_original_file_folder = None
        self.time_of_birth = time.asctime(time.localtime(time.time()))
        self.time_of_init = None
        self.to_json_times = []
        self.from_json_times = []
        self._action_queue = []

        if not from_json:
            # Set up a session ID and store it
            self.session_id = uuid.uuid4()

            # Set up folders
            self.base_audio_path = config.USER_AUDIO_FOLDER
            self.user_original_file_folder = os.path.join(self.base_audio_path, self.url_safe_id,
                                                          config.USER_AUDIO_ORIGINAL_FOLDER_NAME)
            utils.safe_makedirs(self.user_original_file_folder)

            logger.info('New session ready! - {}'.format(self.url_safe_id))

        self.user_original_file_location = None
        self.user_general_audio = None

        self.undo_list = []
        self.initialized = False

    @property
    def url_safe_id(self):
        # 22 chars long (last two chars are '==')
        return base64.urlsafe_b64encode(self.session_id.bytes)[:22]

    @property
    def stft_done(self):
        if self.user_general_audio is None:
            return False

        return self.user_general_audio.stft_done

    def initialize(self, path_to_file):
        try:
            if not os.path.isfile(path_to_file):
                raise Exception('File path not a file! - {}'.format(path_to_file))

            self.user_original_file_location = path_to_file
            # if os.path.splitext(path_to_file)[1] in self._file_ext_that_need_converting:
            #     # TODO: Conversion
            #     converted_path = None
            #     self.user_converted_file_location = converted_path
                # self.file_needs_conversion = False

            user_signal = nussl.AudioSignal(self.user_original_file_location)
            self.user_general_audio = audio_processing.GeneralAudio(user_signal, self.user_original_file_folder)
            self.initialized = True
            self.time_of_init = time.asctime(time.localtime(time.time()))

        except Exception as e:
            logger.error('Got exception! - {}'.format(e.message))
            raise e

    def push_action(self, action_dict):
        self._action_queue.append(actions.Action.new_action(action_dict))

    def apply_actions_in_queue(self):

        for action in self._action_queue:
            action

    def to_json(self):
        self.to_json_times.append(time.asctime(time.localtime(time.time())))
        return json.dumps(self, default=self._to_json_helper)

    def _to_json_helper(self, o):
        if not isinstance(o, SeparationSession):
            raise TypeError

        d = copy.copy(o.__dict__)
        for k, v in d.items():
            if k in self._needs_special_encoding and v is not None:
                d[k] = v.to_json()

            elif isinstance(v, np.ndarray):
                d[k] = nussl.json_ready_numpy_array(v)

            elif isinstance(v, uuid.UUID):
                d[k] = str(v)

        d['__class__'] = o.__class__.__name__
        d['__module__'] = o.__module__

        return d

    @staticmethod
    def from_json(json_string):
        return json.loads(json_string, object_hook=SeparationSession._from_json_helper)

    @staticmethod
    def _from_json_helper(json_dict):
        if '__class__' in json_dict:
            class_name = json_dict.pop('__class__')
            module_ = json_dict.pop('__module__')
            if class_name != SeparationSession.__name__ or module_ != SeparationSession.__module__:
                raise TypeError

            s = SeparationSession(from_json=True)
            for k, v in json_dict.items():

                if k not in s.__dict__:
                    logger.error('Got something I don\'t understand: {}: {}'.format(k, v))
                    continue

                if v is not None and isinstance(v, basestring):

                    if k == 'session_id':
                        s.__dict__[k] = uuid.UUID(v)

                    elif audio_processing.GeneralAudio.__name__ in v:
                        s.__dict__[k] = audio_processing.GeneralAudio.from_json(v)

                    # elif any([cls.__name__ in v for cls in nussl.SeparationBase.__subclasses__()]):
                    #     s.__dict__[k] = nussl.SeparationBase.from_json(v)
                    #
                    # elif isinstance(v, dict) and nussl.constants.NUMPY_JSON_KEY in v:
                    #     s.__dict__[k] = nussl.json_numpy_obj_hook(v[nussl.constants.NUMPY_JSON_KEY])

                    # elif v is not None and k in SeparationSession._needs_special_encoding:
                    #     s.__dict__[k] = audio_processing.SourceSeparation.from_json(v)

                    else:
                        s.__dict__[k] = v if not isinstance(v, unicode) else v.encode('ascii')

                else:
                    s.__dict__[k] = v

            s.from_json_times.append(time.asctime(time.localtime(time.time())))
            return s
        else:
            return json_dict
