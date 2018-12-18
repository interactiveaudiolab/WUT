import json
import logging
import os
import subprocess as sp

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

import sys

sys.path.insert(0, '../nussl')
import nussl

from .interactive_audio_processing_base import InteractiveAudioProcessingBase

logger = logging.getLogger()


class GeneralAudio(InteractiveAudioProcessingBase):
    def __init__(self, mixture_signal, storage_path):
        super(GeneralAudio, self).__init__(mixture_signal, storage_path)

        self.max_frequency_displayed = None
        self.spectrogram_image_path = None
        self.mel_spectrogram_image_path = None

    @property
    def stft_done(self):
        return self.audio_signal_copy.has_stft_data

    def do_spectrogram(self):
        self.audio_signal_copy.to_mono(overwrite=True)
        self.audio_signal_copy.stft()
        return self._log_space_prepare(
            self.audio_signal_copy.get_power_spectrogram_channel(0)
        )

    def get_spectrogram_json(self):
        return json.dumps(self.do_spectrogram().tolist())

    def send_spectrogram_json(self, socket, namespace):
        spec_json = self.get_spectrogram_json()
        socket.emit('spectrogram', {'spectrogram': spec_json}, namespace=namespace)
        logger.info(f'Sent spectrogram for {self.user_audio_signal.file_name}')

    def find_peak_freq(self, freq_min=10000, bump=10):
        """
        Finds the maximum relevant frequency in a signal. If it's an mp3
        :param freq_min:
        :param bump:
        :return:
        """
        if not self.stft_done:
            self.max_frequency_displayed = 20000
            return -1

        elif self.audio_signal_copy.file_name.endswith('wav'):
            self.max_frequency_displayed = self.audio_signal_copy.sample_rate // 2
            return -1

        else:
            freqs = self.audio_signal_copy.freq_vector
            psd = self.audio_signal_copy.get_power_spectrogram_channel(0)
            psd = self._log_space_prepare(psd)

            freq_bin = self.audio_signal_copy.get_closest_frequency_bin(freq_min)
            psd = psd[freq_bin:, :]

            # Best candidate
            all_power = np.sum(psd, axis=1)
            freq_i = np.argmax(np.abs(np.diff(np.log(all_power))))
            idx = freq_i + freq_bin + bump
            idx = len(freqs) - 1 if idx >= len(freqs) else idx

            logger.info(f'Max freq = {freqs[idx]} Hz')

            self.max_frequency_displayed = freqs[idx]
            return idx

    def spectrogram_image(self, img_width=28, img_height=12, dpi=80, cmap='plasma'):
        file_name = f'{self.audio_signal_copy.file_name.replace(".", "_")}_spec.png'
        file_path = os.path.join(self.storage_path, file_name)
        self.spectrogram_image_path = file_path

        spec = self.do_spectrogram()
        max_idx = self.find_peak_freq()
        spec = spec[:max_idx, :]

        fig = plt.figure(frameon=False)
        fig.set_size_inches(img_width, img_height)

        ax = plt.Axes(fig, [0.0, 0.0, 1.0, 1.0])
        ax.set_axis_off()
        fig.add_axes(ax)

        img = ax.imshow(spec, interpolation='nearest', aspect='auto')
        img.set_cmap(cmap)
        ax.invert_yaxis()
        fig.savefig(file_path, dpi=dpi)

    def make_wav_file(self):
        self.audio_signal_copy.istft(overwrite=True)
        file_name_stem = self.audio_signal_copy.file_name.replace('.', '-')
        new_audio_file_name = self._make_new_file_name(file_name_stem, 'wav')

        new_audio_file_path = os.path.join(self.storage_path, new_audio_file_name)
        self.audio_signal_copy.write_audio_to_file(new_audio_file_path)

        return new_audio_file_path

    @staticmethod
    def _make_new_file_name(file_name_stem, extension):
        i = 0
        new_name = f'{file_name_stem}_{i}.{extension}'
        while os.path.isfile(new_name):
            i += 1
            new_name = f'{file_name_stem}_{i}.{extension}'

        return new_name

    def make_mask(self, selections):

        if not self._mask_sanity_check(selections):
            return nussl.separation.BinaryMask.ones(
                self.audio_signal_copy.stft_data.shape
            )

        final_mask = np.zeros_like(
            self.audio_signal_copy.get_stft_channel(0), dtype=float
        )
        for sel in selections:
            mask = sel.make_mask(
                self.audio_signal_copy.time_bins_vector,
                self.audio_signal_copy.freq_vector,
            )
            final_mask += mask

        final_mask = np.clip(final_mask, a_min=0.0, a_max=1.0)

        return self._mask_post_processing(final_mask)
