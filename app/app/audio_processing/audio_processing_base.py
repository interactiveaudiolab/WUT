# coding=utf-8
"""
AudioProcessingBase is the base class for adding backend audio processing modules in WUT
"""
import logging
import copy

import librosa
import numpy as np

import sys

sys.path.insert(0, '../nussl')
import nussl

logger = logging.getLogger()


class InteractiveAudioProcessingBase(object):
    def __init__(self, mixture_signal, storage_path):
        self.storage_path = None
        self.user_audio_signal = None
        self.audio_signal_copy = None

        if mixture_signal is not None:
            if not isinstance(mixture_signal, nussl.AudioSignal):
                raise AudioProcessingBaseException(
                    'audio_signal_object is not nussl.AudioSignal object!'
                )

            if not mixture_signal.has_audio_data:
                raise AudioProcessingBaseException(
                    'audio_signal_object is expected to have audio_data already!'
                )

            self.user_audio_signal = mixture_signal
            self.storage_path = storage_path

            self.audio_signal_copy = copy.copy(self.user_audio_signal)

    def _mask_sanity_check(self, selections):
        if not self.audio_signal_copy.has_stft_data:
            raise Exception('Audio Signal has no STFT data!')

        if len(selections) <= 0:
            logger.warn('No Selections!')
            return False

        return True

    @staticmethod
    def _mask_post_processing(mask):
        final_mask = np.clip(mask, a_min=0.0, a_max=1.0)
        final_mask = final_mask > 0.5
        return nussl.separation.BinaryMask(input_mask=final_mask)

    def make_mask(self, selections):
        """

        :return:
        """

    def apply_masks(self, masks):
        """

        :return:
        """
        audio_signal = copy.copy(self.audio_signal_copy)

        for mask in masks:
            audio_signal = audio_signal.apply_mask(mask)

        return audio_signal

    @staticmethod
    def _log_space_prepare(array):
        return np.add(librosa.amplitude_to_db(array, ref=np.max).astype('int8'), 80)


class AudioProcessingBaseException(Exception):
    pass
