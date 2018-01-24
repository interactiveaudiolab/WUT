# coding=utf-8
"""
2DFT tasks in here
"""
import logging
import json

import numpy as np
import general_audio
import scipy.ndimage

logger = logging.getLogger()


class FT2D(general_audio.GeneralAudio):

    def __init__(self, audio_signal_object, storage_path):
        super(FT2D, self).__init__(audio_signal_object, storage_path)
        # self.ft2d = nussl.FT2D(self.audio_signal_copy)
        self.stft = None
        self.ft2d = None
        self.ft2d_preview = None
        self.zoom_ratio = 1.0

    def get_2dft_json(self):
        self.audio_signal_copy.to_mono(overwrite=True)
        self.stft = self.audio_signal_copy.stft(overwrite=True, remove_reflection=True, use_librosa=False)

        # # 2DFT for each channel
        # ft2d = np.stack([np.fft.fft2(np.abs(self.stft[:, :, i]))
        #                       for i in range(self.audio_signal_copy.num_channels)], axis=-1)
        #
        # # Average both channels of magnitude 2DFT
        # self.ft2d = np.mean(np.abs(ft2d), axis=-1)

        self.ft2d = np.fft.fft2(np.abs(self.stft[:, :, 0]))
        ft2d_preview = np.abs(self.ft2d)
        # ft2d_preview[0, 0] = 0

        # Swap quadrants
        ft2d_preview = np.fft.fftshift(ft2d_preview)

        # Only take top half (bottom half is redundant) and zero out origin
        freq_bins, time_bins = np.array(ft2d_preview.shape) // 2
        ft2d_preview = ft2d_preview[freq_bins:, time_bins:]

        self.ft2d_preview = scipy.ndimage.zoom(ft2d_preview, zoom=self.zoom_ratio)
        ft2d = general_audio.GeneralAudio._prep_spectrogram(self.ft2d_preview)
        return json.dumps(ft2d.tolist())

    def send_2dft_json(self, socket, namespace):
        ft2d_json = self.get_2dft_json()
        socket.emit('ft2d', {'ft2d': ft2d_json}, namespace=namespace)
        logger.info('Sent 2DFT for {}'.format(self.audio_signal.file_name))


class General2DFTException(Exception):
    pass
