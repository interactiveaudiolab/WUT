import json
import logging

import numpy as np

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from . import audio_processing_base

import sys
sys.path.insert(0, '../../nussl')
import nussl
import inspect

logger = logging.getLogger()


class DeepSeparationWrapper(
    audio_processing_base.InteractiveAudioProcessingBase
):
    """

    """

    def __init__(
        self,
        mixture_signal,
        storage_path,
        model_path='speech_wsj8k.pth'
    ):
        super(DeepSeparationWrapper, self).__init__(
            mixture_signal,
            storage_path,
        )
        mixture_signal.to_mono()
        self._deep_separation = nussl.DeepSeparation(
            mixture_signal,
            num_sources=2,
            mask_type='soft',
            model_path=nussl.efz_utils.download_trained_model(model_path)
        )

    def separate(self):
        self._deep_separation.run()

    def get_embeddings_and_spectrogram(self):
        self.separate()
        return (
            self._deep_separation.project_embeddings(2),
            self._deep_separation.log_spectrogram
        )

    # TODO: this shouldn't really be here
    # not really DeepSeparation specific
    def generate_mask_from_assignments(self, assignments):
        logger.info(
            f'spectrogram dimensions: {self._deep_separation.log_spectrogram.shape}'
        )
        logger.info(
            f'assignments dimensions: {len(assignments)}, {len(assignments[0])}'
        )
        logger.info(
            f'assignments inner dimension:\n{assignments[0]}'
        )
        return nussl.separation.masks.BinaryMask(np.asarray(assignments))

    def apply_mask(self, mask):
        logger.info(f'mask type: {type(mask)}')
        return self._deep_separation.apply_mask(mask)

    # remove reliance on user_original_file_folder here
    def send_separation(self, socket, namespace, file_path):
        binned_embeddings, log_spectrogram = self._massage_data(
            self.get_embeddings_and_spectrogram()
        )

        self._save_spectrogram_image(log_spectrogram, file_path)

        socket.emit(
            'binned_embeddings',
            json.dumps(binned_embeddings),
            namespace=namespace
        )
        socket.emit(
            'spectrogram',
            json.dumps(log_spectrogram.tolist()),
            namespace=namespace
        )

        logger.info(f'Sent separation for {self.user_audio_signal.file_name}')

    @staticmethod
    def _save_spectrogram_image(data, file_path):
        # duplicating of functionality, don't do this in production
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

    # UTILITIES BELOW HERE

    def _massage_pca(self, embeddings):
        # Scale and bin PCA points

        dim = 99
        scaled = self._scale_pca(embeddings, dim)
        binned = self._bin_matrix(scaled, self._make_square_matrix(dim + 1))

        return binned

    def _massage_data(self, data):
        # Scale and bin PCA points
        pca, mel = data

        dim = 99
        scaled = self._scale_pca(pca, dim)
        binned = self._bin_matrix(scaled, self._make_square_matrix(dim + 1))

        # transpose mel
        mel = mel[:,:,0]

        return binned, mel

    @staticmethod
    def _scale_num(num, _min, _max, scaled_min, scaled_max):
        """
            Scales given number between given scaled_min and scaled_max.
            _min and _max of source distribution needed for scaling.
        """
        return (((scaled_max - scaled_min) * (num - _min)) / (_max - _min)) + scaled_min

    def _clean_coordinates(self, coord, x_edges, y_edges, new_max=99, new_min=0):
        """
            coord is x, y tuple (technically two item list), edges are tuples
            holding min and max values along respective axes. new_max and
            new_min specify range to scale points to.
        """
        return (int(round(self._scale_num(coord[0], x_edges[0], x_edges[1], new_min, new_max))),
                int(round(self._scale_num(coord[1], y_edges[0], y_edges[1], new_min, new_max))))

    @staticmethod
    def _find_pca_min_max(pca):
        """
            Takes Zx2 numpy array and returns tuples of tuples giving min and
            max along each dimension
        """
        mins = np.amin(pca, 0)
        maxes = np.amax(pca, 0)
        return (mins[0], maxes[0]), (mins[1], maxes[1])

    def _scale_pca(self, pca, new_max=99, new_min=0):
        """
            takes Zx2 (specifically TFx2 as used) numpy array and scales all
            coordinates
        """
        x_edges, y_edges = self._find_pca_min_max(pca)

        scale_and_clean = lambda coord: self._clean_coordinates(coord, x_edges, y_edges,
                                                                new_max, new_min)
        return np.apply_along_axis(scale_and_clean, 1, pca)

    @staticmethod
    def _make_square_matrix(dim=100):
        """
            Generates 3D array where inner cells are empty arrays
        """
        return [[[] for x in range(dim)] for y in range(dim)]

    @staticmethod
    def _bin_matrix(scaled_tf, matrix):
        """
            Given scaled Zx2 array, bins indices of coordinates
        """
        # come back to this
        # don't know why but x and y need to be swapped here
        for index, (y, x) in enumerate(scaled_tf):
            matrix[x][y].append(index)

        return matrix

    @staticmethod
    def _make_hist(matrix):
        """
            Makes histogram from binned matrix. Used only on server side for
            testing.
        """
        for x in range(len(matrix)):
            for y in range(len(matrix[0])):
                matrix[x][y] = np.log(len(matrix[x][y]) + 1)

        return matrix