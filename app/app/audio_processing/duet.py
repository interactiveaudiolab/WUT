# coding=utf-8
"""
DUET tasks in here
"""
import json
import logging

import numpy as np

from . import audio_processing_base
from .. import nussl

logger = logging.getLogger()


class Duet(audio_processing_base.AudioProcessingBase):
    """

    """

    def __init__(self, audio_signal, storage_path):
        super(Duet, self).__init__(audio_signal, storage_path)
        self.duet = nussl.Duet(audio_signal, 2)
        self.atn_delay_hist = None

    def get_ad_histogram_json(self):
        self.atn_delay_hist = self.duet.get_atn_delay_histogram(recompute=True, normalized=True)
        self.atn_delay_hist *= 80
        self.atn_delay_hist = self.atn_delay_hist.T
        return json.dumps(self.atn_delay_hist.tolist())

    def send_ad_histogram_json(self, socket, namespace):
        ad_hist_json = self.get_ad_histogram_json()
        socket.emit('ad_hist', {'ad_hist': ad_hist_json}, namespace=namespace)
        logger.info('Sent AD histogram for {}'.format(self.user_audio_signal.file_name))

    def make_mask(self, selections):

        if not self._mask_sanity_check(selections):
            return nussl.separation.BinaryMask.ones(self.audio_signal_copy.stft_data.shape)

        final_mask = np.zeros_like(self.audio_signal_copy.get_stft_channel(0), dtype=float)
        ad_hist = self.atn_delay_hist
        for sel in selections:
            mask = sel.make_mask(np.linspace(-3, 3, ad_hist.shape[1]), np.linspace(-3, 3, ad_hist.shape[0]))
            applied_mask = ad_hist * mask
            peaks = nussl.utils.find_peak_indices(applied_mask, 1)
            peaks.append(nussl.utils.find_peak_indices(ad_hist * np.logical_not(mask), 1)[0])
            duet_mask = self.duet.convert_peaks_to_masks(peak_indices=peaks)[1]
            final_mask += duet_mask.get_channel(0)

        return self._mask_post_processing(final_mask)
