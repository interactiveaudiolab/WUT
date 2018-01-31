# coding=utf-8
"""
General audio tasks in here
"""
import copy
import json
import logging
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import librosa
from .. import nussl

from . import audio_processing_base

logger = logging.getLogger()


class GeneralAudio(audio_processing_base.AudioProcessingBase):
    PREVIEW = 'preview'
    MASTER = 'master'

    def __init__(self, audio_signal, storage_path):
        super(GeneralAudio, self).__init__(audio_signal, storage_path)

        self.mode = self.MASTER
        self.master_params = None
        self.preview_params = None
        self.max_frequency_displayed = None

        self.master_params = nussl.stft_utils.StftParams(self.audio_signal_copy.sample_rate)
        self.preview_params = nussl.stft_utils.StftParams(self.audio_signal_copy.sample_rate,
                                                          window_length=2048, n_fft_bins=1024)

    @property
    def stft_done(self):
        return self.audio_signal_copy.has_stft_data

    def do_spectrogram(self):
        # self.audio_signal_view.stft_params = self.preview_params
        self.audio_signal_copy.to_mono(overwrite=True)
        self.audio_signal_copy.stft()
        # self.audio_signal_view.stft()
        return self._prep_spectrogram(self.audio_signal_copy.get_power_spectrogram_channel(0))

    @staticmethod
    def _prep_spectrogram(spectrogram):
        return np.add(librosa.logamplitude(spectrogram, ref_power=np.max).astype('int8'), 80)

    def get_spectrogram_json(self):
        spec = self.do_spectrogram()
        return json.dumps(spec.tolist())

    def send_spectrogram_json(self, socket, namespace):
        spec_json = self.get_spectrogram_json()
        socket.emit('spectrogram', {'spectrogram': spec_json}, namespace=namespace)
        logger.info('Sent spectrogram for {}'.format(self.user_audio_signal.file_name))

    def find_peak_freq(self, freq_min=10000, bump=10):
        if not self.stft_done:
            return 20000
        elif self.audio_signal_copy.file_name.endswith('wav'):
            return self.audio_signal_copy.sample_rate // 2
        else:
            freqs = self.audio_signal_copy.freq_vector
            psd = self.audio_signal_copy.get_power_spectrogram_channel(0)
            psd = np.add(librosa.logamplitude(psd, ref_power=np.max).astype('int8'), 80)

            freq_bin = self.audio_signal_copy.get_closest_frequency_bin(freq_min)
            psd = psd[freq_bin:, :]

            # Best candidate
            all_power = np.sum(psd, axis=1)
            freq_i = np.argmax(np.abs(np.diff(np.log(all_power))))
            idx = freq_i + freq_bin + bump

            logger.info('Max freq = {} Hz'.format(freqs[idx]))

            self.max_frequency_displayed = freqs[idx]
            return idx

    def spectrogram_image(self):
        file_name = '{}_spec.png'.format(self.audio_signal_copy.file_name.replace('.', '_'))
        file_path = os.path.join(self.storage_path, file_name)
        self.spectrogram_image_path = file_path

        spec = self.do_spectrogram()
        max_idx = self.find_peak_freq()
        spec = spec[:max_idx, :]

        w, h = 28, 12

        fig = plt.figure(frameon=False)
        fig.set_size_inches(w, h)

        ax = plt.Axes(fig, [0., 0., 1., 1.])
        ax.set_axis_off()
        fig.add_axes(ax)

        img = ax.imshow(spec, interpolation='nearest', aspect='auto')
        img.set_cmap('plasma')
        ax.invert_yaxis()
        fig.savefig(file_path, dpi=80)

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
