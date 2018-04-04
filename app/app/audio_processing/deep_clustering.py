# coding=utf-8
"""
Deep Clustering tasks in here
"""
import json
import logging

import numpy as np

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from . import audio_processing_base
from .. import utils

import sys
sys.path.insert(0, '../../nussl')
import nussl

logger = logging.getLogger()


class DeepClustering(audio_processing_base.InteractiveAudioProcessingBase):
    """

    """

    def __init__(self, mixture_signal, storage_path,
        model_path='/Users/nathan/Downloads/_winter/research/code/deep_clustering_vocal_44k_long.model',
        hidden_size = 500,
        resample_rate = 44100,
        num_layers = 4):

        super(DeepClustering, self).__init__(mixture_signal, storage_path)

        # TODO: call this correctly, will need model path, etc.
        self.dc = nussl.DeepClustering(mixture_signal,
              model_path = model_path,
              num_sources = 2,
              cutoff = -80,
              hidden_size=hidden_size,
              num_layers=num_layers,
              resample_rate=resample_rate,
            # how to handle stero?
              do_mono = True)

    def perform_deep_clustering(self):
        self.dc.run()
        return self.dc.project_embeddings(2), self.dc.mel_spectrogram

    # remove reliance on user_original_file_folder here
    def send_deep_clustering_results(self, socket, namespace, file_path):
        dc_results = self.perform_deep_clustering()
        pca, mel = self._massage_data(dc_results)

        self._save_mel_image(mel, file_path)

        socket.emit('pca', json.dumps(pca), namespace=namespace)
        socket.emit('mel', json.dumps(mel.tolist()), namespace=namespace)

        logger.info('Sent Deep Clustering for {}'.format(self.user_audio_signal.file_name))

    # duplicating of functionality, don't do this in production
    def _save_mel_image(self, data, file_path):
        w, h = 28, 12

        fig = plt.figure(frameon=False)
        fig.set_size_inches(w, h)

        ax = plt.Axes(fig, [0., 0., 1., 1.])
        ax.set_axis_off()
        fig.add_axes(ax)

        img = ax.imshow(data, interpolation='nearest', aspect='auto')
        img.set_cmap('plasma')
        ax.invert_yaxis()
        fig.savefig(file_path, dpi=80)

        return file_path

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


    # UTILITIES BELOW HERE


    def _massage_data(self, data):
        # Scale and bin PCA points
        pca, mel = data

        dim = 99
        scaled = self._scale_pca(pca, dim)
        binned = self._bin_matrix(scaled, self._make_square_matrix(dim + 1))

        # transpose mel
        mel = mel[0].T

        return binned, mel


    def _scale_num(self, num, _min, _max, scaled_min, scaled_max):
        """
            Scales given number between given scaled_min and scaled_max.
            _min and _max of source distribution needed for scaling.
        """
        return (((scaled_max - scaled_min) * (num - _min)) / (_max - _min)) + scaled_min

    def _clean_coordinates(self, coord, x_edges, y_edges, new_max = 99, new_min = 0):
        """
            coord is x, y tuple (technically two item list), edges are tuples
            holding min and max values along respective axes. new_max and
            new_min specify range to scale points to.
        """
        return (int(round(self._scale_num(coord[0], x_edges[0], x_edges[1], new_min, new_max))),
            int(round(self._scale_num(coord[1], y_edges[0], y_edges[1], new_min, new_max))))

    def _find_pca_min_max(self, pca):
        """
            Takes Zx2 numpy array and returns tuples of tuples giving min and
            max along each dimension
        """
        mins = np.amin(pca, 0)
        maxes = np.amax(pca, 0)
        return (mins[0], maxes[0]), (mins[1], maxes[1])

    def _scale_pca(self, pca, new_max=99, new_min = 0):
        """
            takes Zx2 (specifically TFx2 as used) numpy array and scales all
            coordinates
        """
        x_edges, y_edges = self._find_pca_min_max(pca)

        scale_and_clean = lambda coord: self._clean_coordinates(coord, x_edges, y_edges, new_max, new_min)
        return np.apply_along_axis(scale_and_clean, 1, pca)

    def _make_square_matrix(self, dim=100):
        """
            Generates 3D array where inner cells are empty arrays
        """
        return [[[] for x in range(dim)] for y in range(dim)]

    def _bin_matrix(self, scaled_tf, matrix):
        """
            Given scaled Zx2 array, bins indices of coordinates
        """
        # come back to this
        # don't know why but x and y need to be swapped here
        for index, (y, x) in enumerate(scaled_tf):
            matrix[x][y].append(index)

        return matrix

    def _make_hist(self, matrix):
        """
            Makes histogram from binned matrix. Used only on server side for
            testing.
        """
        for x in range(len(matrix)):
            for y in range(len(matrix[0])):
                matrix[x][y] = np.log(len(matrix[x][y]) + 1)

        return matrix
