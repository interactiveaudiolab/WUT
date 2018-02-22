# coding=utf-8
"""
Algorithm picker
"""
import os
import threading
import numpy as np
from .. import nussl

from .. import utils
from .recommendation_base import RecommendationEngineBase, RecommendationException


class SDRPredictor(RecommendationEngineBase):

    LABELS = ['repet_sim', 'projet', 'melodia']

    def __init__(self, mixture_signal, storage_path, goal, params):
        super(SDRPredictor, self).__init__(mixture_signal, storage_path, goal, params)

        # Set up RepetSIM
        # self.repet_sim = nussl.RepetSim(mixture_signal)
        self.repet_sim = None
        self.repet_masks = []
        self.repet_results = []
        self.repet_results_metadata = {}
        self.repet_dir = os.path.join(storage_path, 'repet_sim')
        utils.safe_makedirs(self.repet_dir)

        # Setup PROJET
        # self.projet = nussl.Projet(mixture_signal, 2)
        self.projet = None
        self.projet_results = []
        self.projet_results_metadata = {}
        self.projet_dir = os.path.join(storage_path, 'projet')
        utils.safe_makedirs(self.projet_dir)

        # Setup Melodia
        self.melodia = None
        self.melodia_masks = []
        self.melodia_results = []
        self.melodia_results_metadata = {}
        self.melodia_dir = os.path.join(storage_path, 'melodia')
        utils.safe_makedirs(self.melodia_dir)

        # Setup threads
        self.run_funcs = [self._run_repet_sim, self._run_projet]
        self.algorithms_run_yet = False
        self.predictions = None

    def _run_repet_sim(self):

        self.repet_masks += self.repet_sim.run()
        self.repet_results += self.repet_sim.make_audio_signals()

        bg_path = os.path.join(self.repet_dir, 'background.wav')
        self.repet_results_metadata['background'] = {'path': bg_path}
        self.repet_results[0].write_audio_to_file(bg_path)

        fg_path = os.path.join(self.repet_dir, 'foreground.wav')
        self.repet_results_metadata['foreground'] = {'path': fg_path}
        self.repet_results[1].write_audio_to_file(fg_path)

    def _run_projet(self):

        self.projet.run()
        self.projet_results += self.projet.make_audio_signals()

        for i, signal in enumerate(self.projet_results):
            path = os.path.join(self.projet_dir, 'projet_{}.wav'.format(i))
            self.projet_results_metadata['source_{}'.format(i)] = {'path': path}
            signal.write_audio_to_file(path)

    def _run_melodia(self):
        pass

    def _run_source_separation_algorithms(self):
        for f in self.run_funcs:
            thread = threading.Thread(target=f)
            thread.start()
            thread.join()
        self.algorithms_run_yet = True

    def compute_recommendations(self):

        self._run_source_separation_algorithms()

    def _prepare_data(self, predictions):
        n_seconds = len(predictions)
        eps = 0.9

        timestamps = np.arange(n_seconds)
        timestamps_ = timestamps + eps

        timestamps = list(np.ravel(np.column_stack((timestamps, timestamps_))))  # interleave the two lists

        predictions -= 15
        predictions = np.power(10, np.divide(predictions, 20))
        predictions = np.repeat(predictions, 2, 0)

        data = {}
        for i, label in enumerate(self.LABELS):
            data[label] = [{ 'x': utils.trunc(timestamps[j]), 'y': utils.trunc(predictions[j, i]) }
                           for j in range(n_seconds * 2)]

        return data

    def dummy_recommendations(self):
        dummy_file = '/Users/ethanmanilow/Documents/School/Research/audio_representations' \
                     '/website/backend/output/sdr_predictions.npy'

        if self.predictions is None:
            self.predictions = self._prepare_data(np.load(dummy_file))

        return self.predictions



