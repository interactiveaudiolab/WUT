# coding=utf-8
"""
2DFT tasks in here
"""
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO

import logging

import numpy as np
import general_audio
from .. import nussl

logger = logging.getLogger()


class FT2D(general_audio.GeneralAudio):

    def __init__(self, audio_signal_object, storage_path):
        super(FT2D, self).__init__(audio_signal_object, storage_path)
        # self.ft2d = nussl.FT2D(self.audio_signal_copy)
        self.stft = None
        self.ft2d = None

    def get_2dft_csv_string(self):
        csv_file_name = '{}_2dft.csv'.format(self.audio_signal_copy.file_name)
        self.audio_signal_copy.to_mono(overwrite=True)
        self.stft = self.audio_signal_copy.stft(overwrite=True, remove_reflection=True, use_librosa=False)
        self.ft2d = np.stack([np.fft.fft2(np.abs(self.stft[:, :, i]))
                              for i in range(self.audio_signal_copy.num_channels)], axis=-1)
        self.ft2d = np.mean(np.abs(self.ft2d), axis=-1)
        # freq_bins, time_bins = np.array(self.ft2d.shape) // 2
        # self.ft2d = self.ft2d[:freq_bins, :time_bins]
        # self.ft2d[0, 0] = 0

        return general_audio.GeneralAudio._csv_string_maker(self.ft2d), csv_file_name


class General2DFTException(Exception):
    pass
