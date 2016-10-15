# coding=utf-8
"""

"""

import nussl
import audio_processing
import json
import copy
import numpy as np

class SeparationSession(object):
    """
    Object for a single session
    """
    _needs_special_encoding = ['user_audio_signal', 'general', 'repet']

    def __init__(self):
        """

        """
        # super(JSONEncoder, self).__init__()
        self.user_file_location = None
        self.user_audio_signal = nussl.AudioSignal()
        self.general = None
        self.repet = None
        # self.source_separator_dict = {'general': None, 'repet': None}
        self.undo_list = []
        self.initialized = False

    def do_repet(self):
        pass

    def initialize(self, path_to_file):
        # try:
        self.user_file_location = path_to_file
        self.user_audio_signal = nussl.AudioSignal(self.user_file_location)
        self.general = audio_processing.SourceSeparation(self.user_audio_signal)
        self.repet = audio_processing.Repet(self.user_audio_signal)
        self.initialized = True

    def to_json(self):
        return json.dumps(self, default=self._to_json_helper)

    def _to_json_helper(self, o):
        if not isinstance(o, SeparationSession):
            raise TypeError

        d = copy.copy(o.__dict__)
        for k, v in d.iteritems():
            if k in self._needs_special_encoding and v is not None:
                d[k] = v.to_json()
            elif isinstance(v, np.ndarray):
                d[k] = nussl.json_ready_numpy_array(v)
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
            module = json_dict.pop('__module__')
            if class_name != SeparationSession.__name__ or module != SeparationSession.__module__:
                raise TypeError

            s = SeparationSession()
            for k, v in json_dict.items():
                if v is not None and isinstance(v, basestring):
                    if nussl.AudioSignal.__name__ in v:
                        s.__dict__[k] = nussl.AudioSignal.from_json(v)
                    elif any([cls.__name__ in v for cls in nussl.SeparationBase.__subclasses__()]):
                        s.__dict__[k] = nussl.SeparationBase.from_json(v)
                elif isinstance(v, dict) and nussl.constants.NUMPY_JSON_KEY in v:
                    s.__dict__[k] = nussl.json_numpy_obj_hook(v[nussl.constants.NUMPY_JSON_KEY])
                elif v is not None and k in SeparationSession._needs_special_encoding:
                    s.__dict__[k] = audio_processing.SourceSeparation.from_json(v)
                else:
                    s.__dict__[k] = v if not isinstance(v, unicode) else v.encode('ascii')
            return s
        else:
            return json_dict

