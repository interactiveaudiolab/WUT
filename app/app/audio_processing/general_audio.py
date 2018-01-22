# coding=utf-8
"""
General audio tasks in here
"""
import copy
import json
import logging
import os

import matplotlib.pyplot as plt
import numpy as np
import librosa
from .. import nussl

logger = logging.getLogger()


class GeneralAudio(object):
    _needs_special_encoding = ['audio_signal', 'audio_signal_copy', 'preview_params', 'master_params',
                               'audio_signal_view', 'FT2D']
    PREVIEW = 'preview'
    MASTER = 'master'

    def __init__(self, audio_signal_object, storage_path):

        self.audio_signal = None
        self.audio_signal_copy = None
        self.audio_signal_view = None
        self.storage_path = None

        self.spec_csv_path = None
        self.spec_json_path = None
        self.freq_max = None

        self.mode = self.MASTER
        self.master_params = None
        self.preview_params = None
        self.zoom_ratio = 0.75

        if audio_signal_object is not None:
            if not isinstance(audio_signal_object, nussl.AudioSignal):
                raise GeneralAudioException('audio_signal_object is not nussl.AudioSignal object!')

            if not audio_signal_object.has_audio_data:
                raise GeneralAudioException('audio_signal_object is expected to have audio_data already!')

            self.audio_signal = audio_signal_object  # Original audio data. Don't edit this.
            self.audio_signal_copy = copy.copy(self.audio_signal)
            self.audio_signal_view = copy.copy(self.audio_signal)
            self.storage_path = storage_path

            self.master_params = nussl.stft_utils.StftParams(self.audio_signal_copy.sample_rate)
            self.preview_params = nussl.stft_utils.StftParams(self.audio_signal_copy.sample_rate,
                                                              window_length=2048, n_fft_bins=1024)

    @property
    def stft_done(self):
        return self.audio_signal_copy.has_stft_data

    @staticmethod
    def _prep_spectrogram(spectrogram):
        return np.add(librosa.logamplitude(spectrogram, ref_power=np.max).astype('int8'), 80)

    def get_spectrogram_json(self):
        self.audio_signal_view.stft_params = self.preview_params
        self.audio_signal_copy.to_mono(overwrite=True)
        self.audio_signal_copy.stft()  # TODO: put this in a worker thread
        self.audio_signal_view.stft()
        spec = self._prep_spectrogram(self.audio_signal_view.get_power_spectrogram_channel(0))
        return json.dumps(spec.tolist())

    def spectrogram_image(self):
        file_name = '{}_spec.png'.format(self.audio_signal_copy.file_name.replace('.', '_'))
        file_path = os.path.join(self.storage_path, file_name)

        self.audio_signal_copy.stft()
        spec = self.audio_signal_view.get_power_spectrogram_channel(0)
        spec = self._prep_spectrogram(spec)

        img = plt.imshow(spec, interpolation='nearest')
        img.set_cmap('hot')
        plt.axis('off')
        plt.savefig(file_path, bbox_inches='tight')

        return file_path

    def make_wav_file(self):
        self.audio_signal_copy.istft(overwrite=True)
        self.audio_signal_copy.plot_spectrogram(os.path.join(self.storage_path, 'result.png'))
        self.audio_signal_view.audio_data = self.audio_signal_copy.audio_data
        file_name_stem = self.audio_signal_copy.file_name.replace('.', '-')

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
        self.audio_signal_copy.write_audio_to_file(new_audio_file_path)

        return new_audio_file_path


class GeneralAudioException(Exception):
    pass
