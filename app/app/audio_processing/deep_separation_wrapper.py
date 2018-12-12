import json
import logging

import numpy as np

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from . import audio_processing_base
from . import annotation_dataset

import sys
sys.path.insert(0, '../nussl')
import nussl
import inspect

import os

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
        self.model_path = nussl.efz_utils.download_trained_model(model_path)
        self.original_path = self.model_path

        mixture_signal.to_mono()
        self._deep_separation = nussl.DeepSeparation(
            mixture_signal,
            num_sources=2,
            mask_type='soft',
            model_path=self.model_path,
        )
        # hardcoding in square PCA
        self.PCA_dimension = 100

    def separate(self):
        self._deep_separation.run()

    def build_annotation_dataset(self, assignments):
        data = self._deep_separation._preprocess()
        data['magnitude_spectrogram'] = data['magnitude_spectrogram'].cpu().numpy()[0]
        data['log_spectrogram'] = data['log_spectrogram'].cpu().numpy()[0]

        assignments = np.asarray(assignments)
        dataset_input = {
            'magnitude_spectrogram': data['magnitude_spectrogram'],
            'log_spectrogram': data['log_spectrogram'],
            'assignments': np.stack([assignments, 1-assignments], len(assignments.shape))
        }
        dataset = annotation_dataset.AnnotationDataset(
            options=self._deep_separation.metadata,
            **dataset_input,
        )
        return dataset

    def get_model_and_metadata(self):
        return (self._deep_separation.model, self._deep_separation.metadata)

    def load_model(self, path):
        return self._deep_separation.load_model(path)

    def set_model(self, path):
        self._deep_separation.model, _ = self._deep_separation.load_model(path)

    def get_embeddings_and_spectrogram(self):
        self.separate()
        return (
            # projected embeddings in TF format where the first F values
            # correspond to the embedding for each frequency point at time 0
            self._deep_separation.project_embeddings(2),
            self._deep_separation.log_spectrogram
        )

    # TODO: this shouldn't really be here
    # not really DeepSeparation specific
    def generate_mask_from_assignments(self, assignments):
        # assignments & embeddings in TF form (`(T, F)` shape)
        # audio signal (and therefore mask) in FT form (`(F, T)` shape)
        # hence the `.T`
        return nussl.separation.masks.BinaryMask(np.asarray(assignments).T)

    def apply_mask(self, mask):
        return self._deep_separation.apply_mask(mask)

    # remove reliance on user_original_file_folder here
    def send_separation(self, socket, namespace, file_path = ''):
        binned_embeddings, log_spectrogram = self._massage_data(
            *self.get_embeddings_and_spectrogram()
        )

        socket.emit(
            'binned_embeddings',
            json.dumps(binned_embeddings),
            namespace=namespace
        )

        if file_path:
            self._save_spectrogram_image(log_spectrogram, file_path)
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

        img = ax.imshow(
            data,
            interpolation='nearest',
            aspect='auto',
            cmap='Greys',
        )
        ax.invert_yaxis()
        fig.savefig(file_path, dpi=80)

        return file_path

    # UTILITIES BELOW HERE

    def _massage_data(self, pca, spectrogram):
        """Scale and bin PCA points"""
        binned = self._bin_matrix(
            self._scale_pca(
                pca,
                self.PCA_dimension - 1,
            ),
            self._make_square_matrix(self.PCA_dimension),
            spectrogram,
        )

        # TODO: handle mutlichannel audio, currently just taking first channel
        spectrogram = spectrogram[:,:,0]

        return binned, spectrogram

    @staticmethod
    def _scale_num(num, _min, _max, scaled_min, scaled_max):
        """Scales given number between given scaled_min and scaled_max. _min and
        _max of source distribution needed for scaling.
        """
        return scaled_min + (
            ((scaled_max - scaled_min) * (num - _min)) / (_max - _min)
        )

    def _clean_coordinates(self, coord, x_edges, y_edges, new_max=99, new_min=0):
        """`coord` is x, y tuple (technically two item list), edges are tuples
        holding min and max values along respective axes. new_max and new_min
        specify range to scale points to.
        """
        return (
            int(round(self._scale_num(
                coord[0],
                x_edges[0],
                x_edges[1],
                new_min,
                new_max
            ))),
            int(round(self._scale_num(
                coord[1],
                y_edges[0],
                y_edges[1],
                new_min,
                new_max
            )))
        )

    @staticmethod
    def _find_pca_min_max(pca):
        """Takes Zx2 numpy array and returns tuples of tuples giving min and max
        along each dimension
        """
        mins = np.amin(pca, 0)
        maxes = np.amax(pca, 0)
        return (mins[0], maxes[0]), (mins[1], maxes[1])

    def _scale_pca(self, pca, new_max=99, new_min=0):
        """Takes Zx2 (specifically TFx2 as used) numpy array and scales all
        coordinates
        """
        x_edges, y_edges = self._find_pca_min_max(pca)

        scale_and_clean = lambda coord: self._clean_coordinates(
            coord,
            x_edges,
            y_edges,
            new_max,
            new_min
        )
        return np.apply_along_axis(scale_and_clean, 1, pca)

    @staticmethod
    def _make_square_matrix(dim=100):
        """Generates 3D array where inner cells are empty arrays"""
        return [[[] for x in range(dim)] for y in range(dim)]

    @staticmethod
    def _bin_matrix(scaled_tf, matrix, spectrogram):
        """Given scaled Zx2 array, bins indices of coordinates"""
        inner_dim = spectrogram.shape[0]
        for index, (x, y) in enumerate(scaled_tf):
            if spectrogram[index % inner_dim][index // inner_dim][0] > -40:
                matrix[x][y].append(index)

        return matrix
