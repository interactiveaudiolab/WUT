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
import msgpack
from .. import nussl

logger = logging.getLogger()

class GeneralAudio(object):
    _needs_special_encoding = ['audio_signal']

    def __init__(self, audio_signal_object, storage_path):

        self.audio_signal = None
        self.storage_path = None

        self.spec_csv_path = None
        self.spec_json_path = None
        self.freq_max = None
        self.stft_done = False

        if audio_signal_object is not None:
            if not isinstance(audio_signal_object, nussl.AudioSignal):
                raise GeneralAudioException('audio_signal_object is not nussl.AudioSignal object!')

            if not audio_signal_object.has_audio_data:
                raise GeneralAudioException('audio_signal_object is expected to have audio_data already!')

            self.audio_signal = audio_signal_object
            self.storage_path = storage_path

    @staticmethod
    def _prep_spectrogram(spectrogram):
        return np.add(librosa.logamplitude(spectrogram, ref_power=np.max).astype('int8'), 80)

    def _get_spectrogram_csv_string(self, ch=None, start=None, stop=None):
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
        spec = GeneralAudio._prep_spectrogram(spectrogram)
        output = StringIO()
        np.savetxt(output, spec, delimiter=',', fmt='%i',
                   header=','.join(['t{}'.format(i) for i in range(spec.shape[1])]))
        return output.getvalue()

    def _get_spectrogram_csv_file(self, channel=None, start=None, stop=None):
        logger.debug('Making spectrogram csv file: ch={}, start={}, stop={}'.format(channel, start, stop))
        signal_copy = copy.copy(self.audio_signal)

        # Set active region
        start_sample = 0 if start is None else signal_copy.sample_rate * start
        end_sample = signal_copy.signal_length if start is None else signal_copy.sample_rate * stop
        signal_copy.set_active_region(start_sample, end_sample)
        chan = 0 if channel is None else channel

        # create a file name
        file_name = self.audio_signal.file_name.replace('.', '-')
        csv_file_name = '{}_s{}_e{}_c{}.csv'.format(file_name, start_sample, end_sample, chan)
        csv_file_path = os.path.join(self.storage_path, csv_file_name)

        # Check if we've already made this file before. If so, we serve up that'un
        if os.path.exists(csv_file_path):
            self.spec_csv_path = csv_file_path
            return csv_file_path, self.freq_max

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

        self.freq_max = signal_copy.freq_vector[-1]
        self.spec_csv_path = csv_file_path
        return csv_file_path, self.freq_max

    @staticmethod
    def _csv_file_maker(spectrogram, file_path):
        # Make a temporary csv file
        spec = GeneralAudio._prep_spectrogram(spectrogram)
        np.savetxt(file_path, spec, delimiter=',', fmt='%i',
                   header=','.join(['t{}'.format(i) for i in range(spec.shape[1])]))

    def _get_spectrogram_json_file(self, channel=None, start=None, stop=None):
        logger.debug('Making spectrogram json file: ch={}, start={}, stop={}'.format(channel, start, stop))
        signal_copy = copy.copy(self.audio_signal)

        # Set active region
        start_sample = 0 if start is None else signal_copy.sample_rate * start
        end_sample = signal_copy.signal_length if start is None else signal_copy.sample_rate * stop
        signal_copy.set_active_region(start_sample, end_sample)
        chan = 0 if channel is None else channel

        # create a file name
        json_file_name = '{}_s{}_e{}_c{}.json'.format(self.audio_signal.file_name, start_sample, end_sample, chan)
        json_file_path = os.path.join(self.storage_path, json_file_name)

        # Check if we've already made this file before. If so, we serve up that'un
        if os.path.exists(json_file_path):
            self.spec_json_path = json_file_path
            return json_file_path

        # Channel logic and actually making the file
        if channel is None:
            signal_copy.to_mono(overwrite=True)
            signal_copy.stft()
            self._json_file_maker(signal_copy.get_power_spectrogram_channel(0), json_file_path)

        else:
            signal_copy.stft()
            self._json_file_maker(signal_copy.get_power_spectrogram_channel(channel), json_file_path)

        if not os.path.exists(json_file_path):
            logger.error('Could not find spectrogram json file at {}!'.format(json_file_path))
            raise Exception('Could not find spectrogram json file at {}!'.format(json_file_path))

        freq_max = signal_copy.freq_vector[-1]
        self.spec_json_path = json_file_path
        return json_file_path, freq_max

    @staticmethod
    def _json_file_maker(spectrogram, file_path):
        spectrogram = GeneralAudio._prep_spectrogram(spectrogram)
        spec_json_dict = nussl.utils.json_ready_numpy_array(spectrogram)
        # spec_json_dict['freq_max'] = freq_max
        with open(file_path, 'w') as f:
            json.dump(spec_json_dict, f)

    def make_spectrogram_file(self, channel=None, start=None, stop=None, csv=None):
        csv = csv not in (None, 0.0, 0, '')

        if csv:
            result = self._get_spectrogram_csv_file(channel, start, stop)
        else:
            result = self._get_spectrogram_json_file(channel, start, stop)

        self.stft_done = True
        return result

    def make_wav_file_with_everything_but_selection(self, t_start, t_end, f_start, f_end):
        signal_copy = copy.copy(self.audio_signal)
        signal_copy.stft()

        # find the indices that we need to delete
        f_start_idx = signal_copy.get_closest_frequency_bin(f_start)
        f_end_idx = signal_copy.get_closest_frequency_bin(f_end)
        t_start_idx = (np.abs(signal_copy.time_bins_vector - t_start)).argmin()
        t_end_idx = (np.abs(signal_copy.time_bins_vector - t_end)).argmin()

        # signal_copy.stft_data[f_start_idx:f_end_idx, t_start_idx:t_end_idx] = 0.0j # delete the area in the selection

        # delete everything BUT the selected area
        signal_copy.stft_data[:f_start_idx, :] = 0.0j
        signal_copy.stft_data[f_end_idx:, :] = 0.0j
        signal_copy.stft_data[:, :t_start_idx] = 0.0j
        signal_copy.stft_data[:, t_end_idx:] = 0.0j

        signal_copy.istft(overwrite=True)

        file_name_stem = self.audio_signal.file_name.replace('.', '-')

        # create a new file name
        i = 0
        new_audio_file_name = '{}_{}.wav'.format(file_name_stem, i)
        while os.path.isfile(new_audio_file_name):
            new_audio_file_name = '{}_{}.wav'.format(file_name_stem, i)

        # write the metadata
        # new_metadata_path = os.path.join(self.storage_path, '{}_{}.json'.format(file_name_stem, i))
        # with open(new_metadata_path, 'w') as f:
        #     pass

        new_audio_file_path = os.path.join(self.storage_path, new_audio_file_name)
        signal_copy.write_audio_to_file(new_audio_file_path)

        return new_audio_file_path

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