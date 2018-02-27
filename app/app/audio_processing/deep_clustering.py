# coding=utf-8
"""
Deep Clustering tasks in here
"""
import json
import logging

import numpy as np

from . import audio_processing_base
from .. import utils
from .. import nussl

logger = logging.getLogger()


class DeepClustering(audio_processing_base.InteractiveAudioProcessingBase):
    """

    """

    def __init__(self, mixture_signal, storage_path):
        super(DeepClustering, self).__init__(mixture_signal, storage_path)

        # TODO: call this correctly, will need model path, etc.
        self.dc = nussl.DeepClustering(mixture_signal, 2)

    def perform_deep_clustering(self):
        separation.run()
        data = {'pca': separation.project_embeddings(2),
                'mel': separation.mel_spectrogram}

        return json.dumps(data)

    def send_deep_clustering_results(self, socket, namespace):
        dc_results = self.get_deep_clustering()
        socket.emit('deep_clustering', dc_results, namespace=namespace)
        logger.info('Sent Deep Clustering for {}'.format(self.user_audio_signal.file_name))

    def make_mask(self, selections):
        # TODO: Make a mask here from deep clustering results

        pass

        # if not self._mask_sanity_check(selections):
        #     return nussl.separation.BinaryMask.ones(self.audio_signal_copy.stft_data.shape)

        # final_mask = np.zeros_like(self.audio_signal_copy.get_stft_channel(0), dtype=float)
        # ad_hist = self.atn_delay_hist
        # for sel in selections:
        #     mask = sel.make_mask(np.linspace(-3, 3, ad_hist.shape[1]), np.linspace(-3, 3, ad_hist.shape[0]))
        #     applied_mask = ad_hist * mask
        #     peaks = nussl.utils.find_peak_indices(applied_mask, 1)
        #     peaks.append(nussl.utils.find_peak_indices(ad_hist * np.logical_not(mask), 1)[0])
        #     duet_mask = self.duet.convert_peaks_to_masks(peak_indices=peaks)[1]
        #     final_mask += duet_mask.get_channel(0)

        # return self._mask_post_processing(final_mask)
