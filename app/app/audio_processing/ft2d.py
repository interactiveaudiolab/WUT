# coding=utf-8
"""
2DFT tasks in here
"""
import logging
import json

import numpy as np
import general_audio
from . import audio_processing_base

import sys
sys.path.insert(0, '../../nussl')
import nussl

import scipy.ndimage

logger = logging.getLogger()


class FT2D(audio_processing_base.InteractiveAudioProcessingBase):

    def __init__(self, mixture_signal, storage_path):
        super(FT2D, self).__init__(mixture_signal, storage_path)
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
        ft2d = general_audio.GeneralAudio._log_space_prepare(self.ft2d_preview)
        return json.dumps(ft2d.tolist())

    def send_2dft_json(self, socket, namespace):
        ft2d_json = self.get_2dft_json()
        socket.emit('ft2d', {'ft2d': ft2d_json}, namespace=namespace)
        logger.info('Sent 2DFT for {}'.format(self.user_audio_signal.file_name))

    def make_mask(self, selections):

        if not self._mask_sanity_check(selections):
            return nussl.separation.BinaryMask.ones(self.audio_signal_copy.stft_data.shape)

        final_mask = np.zeros_like(self.ft2d).astype('float')

        for sel in selections:
            mask = sel.make_mask(np.arange(self.ft2d_preview.shape[1]), np.arange(self.ft2d_preview.shape[0]))
            mask = scipy.ndimage.zoom(mask, zoom=1.0 / self.zoom_ratio)
            mask = np.vstack([np.flipud(mask)[1:, :], mask])
            mask = np.hstack([np.fliplr(mask)[:, 1:], mask])
            mask = np.fft.ifftshift(mask)
            final_mask += mask

        return self._mask_post_processing(final_mask)

    def apply_masks(self, masks):

        mask = masks[0].get_channel(0)

        fg_inverted = np.fft.ifft2(np.multiply(mask, self.ft2d))
        bg_inverted = np.fft.ifft2(np.multiply(1 - mask, self.ft2d))

        bg_mask = bg_inverted > fg_inverted  # hard mask
        fg_mask = 1 - bg_mask

        fg_stft = np.multiply(fg_mask, self.audio_signal_copy.get_stft_channel(0))
        bg_stft = np.multiply(bg_mask, self.audio_signal_copy.get_stft_channel(0))

        # if type(self) != RemoveAllButSelections:
        if True:
            stft = fg_stft
        else:
            stft = bg_stft

        return self.audio_signal_copy.make_copy_with_stft_data(np.expand_dims(stft, axis=-1))


class General2DFTException(Exception):
    pass
