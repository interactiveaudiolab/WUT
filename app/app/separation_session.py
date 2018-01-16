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

import numpy as np
import jsonpickle
import jsonpickle.ext.numpy as jsonpickle_numpy

import audio_processing
import config
import nussl
import actions
import utils

# Set up logging
logger = logging.getLogger()


jsonpickle_numpy.register_handlers()


class SeparationSession(object):
    """
    Object for a single session, handles everything
    """
    _needs_special_encoding = ['user_general_audio']
    _uses_jsonpickle = ['_action_queue', 'ft2d', 'duet']
    _file_ext_that_need_converting = ['mp3', 'flac']

    def __init__(self, from_json=False):
        """

        """

        self.session_id = None
        self.base_audio_path = None
        self.user_original_file_folder = None
        self.time_of_birth = time.asctime(time.localtime(time.time()))
        self.time_of_init = None
        self.to_json_times = []
        self.from_json_times = []
        self._action_queue = deque()
        self.audio_contains = []
        self.user_goals = []
        self.save_user_data = False

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
        self.ft2d = None
        self.duet = None

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
        # try:
        if not os.path.isfile(path_to_file):
            raise Exception('File path not a file! - {}'.format(path_to_file))

        self.user_original_file_location = path_to_file
        # if os.path.splitext(path_to_file)[1] in self._file_ext_that_need_converting:
        #     # TODO: Conversion
        #     converted_path = None
        #     self.user_converted_file_location = converted_path
        #     self.file_needs_conversion = False

        user_signal = nussl.AudioSignal(self.user_original_file_location)
        self.user_general_audio = audio_processing.GeneralAudio(user_signal, self.user_original_file_folder)
        self.ft2d = audio_processing.FT2D(user_signal, self.user_original_file_folder)

        if user_signal.is_stereo:
            self.duet = audio_processing.Duet(user_signal, self.user_original_file_folder)

        self.initialized = True
        self.time_of_init = time.asctime(time.localtime(time.time()))

        # except Exception as e:
        #     logger.error('Got exception! - {}'.format(e.message))
        #     raise e

    def save_survey_data(self, survey_data):
        self.audio_contains = survey_data['mixture_contains']
        self.user_goals = survey_data['extraction_goals']
        self.save_user_data = not survey_data['do_not_store']

    def push_action(self, action_dict):
        action_id = len(self._action_queue) + 1
        action = actions.Action.new_action(action_dict, action_id)

        action_entry = {'received': time.asctime(),
                        'owner': self.url_safe_id,
                        'action_id': action_id,
                        'action': action}

        self._action_queue.append(action_entry)

    def apply_actions_in_queue(self):

        while self._action_queue:
            action = self._action_queue.popleft()
            action_object = action['action']
            logger.debug('Applying {} - ID{}, got at {}'.format(str(action_object),
                                                                action['action_id'],
                                                                action['received']))

            action_object.make_mask_for_action(self)

            self.user_general_audio.audio_signal_copy = action_object.apply_action(self)

        # self.user_general_audio.audio_signal_copy.istft()

    def to_json(self):
        return jsonpickle.encode(self)
        # self.to_json_times.append(time.asctime(time.localtime(time.time())))
        # return json.dumps(self, default=self._to_json_helper)

    def _to_json_helper(self, o):
        if not isinstance(o, SeparationSession):
            raise TypeError('Expected SeparationSession but got {} object'.format(type(o)))

        d = copy.copy(o.__dict__)
        for k, v in d.items():

            if k in self._uses_jsonpickle and v is not None:
                d[k] = jsonpickle.encode(v)

            if v is not None and hasattr(v, 'to_json'):
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
        return jsonpickle.decode(json_string)

        # return json.loads(json_string, object_hook=SeparationSession._from_json_helper)

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

                if v is not None and isinstance(v, basestring):  # TODO: python 3-ify

                    if k == 'session_id':
                        s.__dict__[k] = uuid.UUID(v)

                    # elif k == 'ft2d':
                    #     s.__dict__[k] = audio_processing.FT2D.from_json(v)

                    elif audio_processing.GeneralAudio.__name__ in v:
                        s.__dict__[k] = audio_processing.GeneralAudio.from_json(v)

                    # elif any([cls.__name__ in v for cls in nussl.SeparationBase.__subclasses__()]):
                    #     s.__dict__[k] = nussl.SeparationBase.from_json(v)
                    #
                    # elif isinstance(v, dict) and nussl.constants.NUMPY_JSON_KEY in v:
                    #     s.__dict__[k] = nussl.json_numpy_obj_hook(v[nussl.constants.NUMPY_JSON_KEY])

                    # elif v is not None and k in SeparationSession._needs_special_encoding:
                    #     s.__dict__[k] = audio_processing.SourceSeparation.from_json(v)

                    elif k in SeparationSession._uses_jsonpickle:
                        s.__dict__[k] = jsonpickle.decode(v)

                    else:
                        s.__dict__[k] = v if not isinstance(v, unicode) else v.encode('ascii')

                else:
                    s.__dict__[k] = v

            s.from_json_times.append(time.asctime(time.localtime(time.time())))
            return s
        else:
            return json_dict
