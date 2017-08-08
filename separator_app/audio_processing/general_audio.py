# coding=utf-8
"""
General toy_audio tasks in here
"""
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO

import copy
import json
import logging
import os

import numpy as np
import librosa
from .. import nussl

logger = logging.getLogger()

class GeneralAudio(object):
    _needs_special_encoding = ['audio_signal']

    def __init__(self, audio_signal_object, storage_path):

        self.audio_signal = None
        self.storage_path = None
        self.spec_csv_path = None

        if audio_signal_object is not None:
            if not isinstance(audio_signal_object, nussl.AudioSignal):
                raise GeneralAudioException('audio_signal_object is not nussl.AudioSignal object!')

            if not audio_signal_object.has_audio_data:
                raise GeneralAudioException('audio_signal_object is expected to have audio_data already!')

            self.audio_signal = audio_signal_object
            self.storage_path = storage_path

    def get_spectrogram_csv_string(self, ch=None, start=None, stop=None):
        signal_copy = copy.copy(self.audio_signal)

        # Set active region
        start_sample = 0 if start is None else signal_copy.sample_rate * start
        stop_sample = signal_copy.signal_length if start is None else signal_copy.sample_rate * stop
        signal_copy.set_active_region(start_sample, stop_sample)

        if ch is None:
            signal_copy.to_mono(overwrite=True)
            signal_copy.stft()
            return self._csv_string_maker(signal_copy.get_power_spectrogram_channel(0))

        else:
            signal_copy.stft()
            return self._csv_string_maker(signal_copy.get_power_spectrogram_channel(ch))

    @staticmethod
    def _csv_string_maker(spectrogram):
        spec = np.add(librosa.logamplitude(spectrogram, ref_power=np.max).astype('int8'), 80)
        output = StringIO()
        np.savetxt(output, spec, delimiter=',', fmt='%i',
                   header=','.join(['t{}'.format(i) for i in range(spec.shape[1])]))
        return output.getvalue()

    def get_spectrogram_csv_file(self, channel=None, start=None, stop=None):
        logger.debug('Making spectrogram file: ch={}, start={}, stop={}'.format(channel, start, stop))
        signal_copy = copy.copy(self.audio_signal)

        # Set active region
        start_sample = 0 if start is None else signal_copy.sample_rate * start
        end_sample = signal_copy.signal_length if start is None else signal_copy.sample_rate * stop
        signal_copy.set_active_region(start_sample, end_sample)
        chan = 0 if channel is None else channel

        # create a file name
        csv_file_name = '{}_s{}_e{}_c{}.csv'.format(self.audio_signal.file_name, start_sample, end_sample, chan)
        csv_file_path = os.path.join(self.storage_path, csv_file_name)

        # Check if we've already made this file before. If so, we serve up that'un
        if os.path.exists(csv_file_path):
            self.spec_csv_path = csv_file_path
            return csv_file_path

        # Channel logic and actually making the file
        if channel is None:
            signal_copy.to_mono(overwrite=True)
            signal_copy.stft()
            self._csv_file_maker(signal_copy.get_power_spectrogram_channel(0), csv_file_path)

        else:
            signal_copy.stft()
            self._csv_file_maker(signal_copy.get_power_spectrogram_channel(channel), csv_file_path)

        if not os.path.exists(csv_file_path):
            logger.error('Could not find spectrogram csv file at {}!'.format(csv_file_path))
            raise Exception('Could not find spectrogram csv file at {}!'.format(csv_file_path))

        self.spec_csv_path = csv_file_path
        return csv_file_path

    @staticmethod
    def _csv_file_maker(spectrogram, file_path):
        # Make a temporary csv file
        spec = np.add(librosa.logamplitude(spectrogram, ref_power=np.max).astype('int8'), 80)

        np.savetxt(file_path, spec, delimiter=',', fmt='%i',
                   header=','.join(['t{}'.format(i) for i in range(spec.shape[1])]))

    def to_json(self):
        return json.dumps(self, default=self._to_json_helper)

    def _to_json_helper(self, o):
        if not isinstance(o, GeneralAudio):
            raise TypeError

        d = copy.copy(o.__dict__)
        for k, v in d.items():
            if k in self._needs_special_encoding and v is not None:
                d[k] = v.to_json()

            elif isinstance(v, np.ndarray):
                d[k] = nussl.json_ready_numpy_array(v)

        d['__class__'] = o.__class__.__name__
        d['__module__'] = o.__module__

        return d

    @staticmethod
    def from_json(json_string):
        return json.loads(json_string, object_hook=GeneralAudio._from_json_helper)

    @staticmethod
    def _from_json_helper(json_dict):
        if '__class__' in json_dict:
            class_name = json_dict.pop('__class__')
            module_ = json_dict.pop('__module__')
            if class_name != GeneralAudio.__name__ or module_ != GeneralAudio.__module__:
                raise TypeError

            s = GeneralAudio(None, None)
            for k, v in json_dict.items():

                if k not in s.__dict__:
                    logger.error('Got something I don\'t understand: {}: {}'.format(k, v))
                    continue

                if v is not None and isinstance(v, basestring):

                    if nussl.AudioSignal.__name__ in v:
                        s.__dict__[k] = nussl.AudioSignal.from_json(v)

                    elif any([cls.__name__ in v for cls in nussl.SeparationBase.__subclasses__()]):
                        s.__dict__[k] = nussl.SeparationBase.from_json(v)

                    elif isinstance(v, dict) and nussl.constants.NUMPY_JSON_KEY in v:
                        s.__dict__[k] = nussl.json_numpy_obj_hook(v[nussl.constants.NUMPY_JSON_KEY])

                    else:
                        s.__dict__[k] = v if not isinstance(v, unicode) else v.encode('ascii')

                else:
                    s.__dict__[k] = v

            return s
        else:
            return json_dict


class GeneralAudioException(Exception):
    pass