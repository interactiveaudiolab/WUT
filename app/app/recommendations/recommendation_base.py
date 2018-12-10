# coding=utf-8
"""

"""

import sys
sys.path.insert(0, '../nussl')
import nussl


class RecommendationEngineBase(object):

    def __init__(self, mixture_signal, storage_path, goal, params):

        self.mixture_signal = None
        self.storage_path = storage_path
        self.params = params

        if mixture_signal is not None:
            if not isinstance(mixture_signal, nussl.AudioSignal):
                raise RecommendationException('audio_signal_object is not nussl.AudioSignal object!')

            if not mixture_signal.has_audio_data:
                raise RecommendationException('audio_signal_object is expected to have audio_data already!')

            self.mixture_signal = mixture_signal


class RecommendationException(Exception):
    pass
