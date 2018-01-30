# coding=utf-8
"""
SourceSeparation object controls everything
"""
import numpy as np
import json
import copy
from .. import nussl
import librosa
from multiprocessing import Pool
import jsonpickle
import jsonpickle.ext.numpy as jsonpickle_numpy

from flask import jsonify


class AudioProcessingBase(object):

    def __init__(self, audio_signal, storage_path):
        self.storage_path = None
        self.user_audio_signal = None
        self.audio_signal_copy = None
        self.audio_signal_view = None

        if audio_signal is not None:
            if not isinstance(audio_signal, nussl.AudioSignal):
                raise AudioProcessingBaseException('audio_signal_object is not nussl.AudioSignal object!')

            if not audio_signal.has_audio_data:
                raise AudioProcessingBaseException('audio_signal_object is expected to have audio_data already!')

            self.user_audio_signal = audio_signal
            self.storage_path = storage_path

            self.audio_signal_copy = copy.copy(self.user_audio_signal)
            self.audio_signal_view = copy.copy(self.user_audio_signal)

    def make_mask(self):
        """

        :return:
        """

    def apply_mask(self):
        """

        :return:
        """

class AudioProcessingBaseException(Exception):
    pass
