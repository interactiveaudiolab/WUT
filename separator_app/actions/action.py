# coding=utf-8
"""

"""
import logging
import os
import librosa

import numpy as np
import scipy.ndimage
import matplotlib.pyplot as plt

from .. import nussl
from . import selection


logger = logging.getLogger()


class Action(object):
    """
    Encodes an action made by the user from the client side.
    """
    # TODO: eventually change this to: `vars()[self.__name__].__subclasses__()`
    KNOWN_ACTIONS = ['RemoveAllButSelections', 'RemoveSelections']
    VALID_TARGETS = ['spectrogram-heatmap', 'ft2d-heatmap', 'duet-heatmap']
    ACTION_TYPE = 'actionType'
    TARGET = 'target'
    DATA = 'data'

    def __init__(self, action_dict, action_id):
        self.action_dict = None
        if self.is_action_dict_valid(action_dict):
            self.action_dict = action_dict
        else:
            raise ValueError('Invalid action_dict!')

        self.action_id = action_id
        self.data_dict = action_dict[self.DATA]
        self.selections = []
        self.masks = []
        self.target = None

    def is_action_dict_valid(self, action_dict):
        return isinstance(action_dict, dict) and self.DATA in action_dict and self.ACTION_TYPE in action_dict

    @property
    def action_type(self):
        return self.action_dict[self.ACTION_TYPE] if self.action_dict is not None else None

    @property
    def action_data(self):
        return self.action_dict[self.DATA] if self.action_dict is not None else None

    @property
    def is_action_known(self):
        return self.action_type in self.KNOWN_ACTIONS

    @property
    def subclasses(self):
        return vars()[self.__name__].__subclasses__()

    @property
    def known_actions(self):
        return self.subclasses

    def make_mask_for_action(self, session):
        raise NotImplemented

    def apply_action(self, session):
        raise NotImplemented

    @staticmethod
    def new_action(action_dict, action_id):
        if Action.ACTION_TYPE not in action_dict or action_dict[Action.ACTION_TYPE] not in Action.KNOWN_ACTIONS:
            raise ValueError('No {} in action_dict or {} is wrong type!'.format(Action.ACTION_TYPE, Action.ACTION_TYPE))

        action_type = action_dict[Action.ACTION_TYPE]

        return globals()[action_type](action_dict, action_id)


class SelectionBasedRemove(Action):

    SELECTION_DATA = 'selectionData'
    VALID_SELECTION_TYPES = [selection.BoxSelection]

    def __str__(self):
        return self.__class__.__name__

    def __init__(self, action_dict, action_id):
        super(SelectionBasedRemove, self).__init__(action_dict=action_dict, action_id=action_id)
        self.init_action()

    def is_action_dict_valid(self, action_dict):
        if not super(SelectionBasedRemove, self).is_action_dict_valid(action_dict):
            return False

        if self.ACTION_TYPE not in action_dict or action_dict[self.ACTION_TYPE] != str(self):
            return False

        if self.SELECTION_DATA not in action_dict[self.DATA]:
            return False

        if not isinstance(action_dict[self.DATA][self.SELECTION_DATA], list):
            return False

        if self.TARGET not in action_dict or not isinstance(action_dict[self.TARGET], (str, unicode, bytes)):
            return False

        if action_dict[self.TARGET] not in self.VALID_TARGETS:
            return False

        return True

    def init_action(self):
        self.target = self.action_dict[self.TARGET]

        for sel in self.data_dict[self.SELECTION_DATA]:
            new_selection = selection.Selection.new_selection_instance(sel)
            self.selections.append(new_selection)

    def make_mask_for_action(self, session):

        audio_signal = session.user_general_audio.audio_signal_copy

        if not audio_signal.has_stft_data:
            raise Exception('Audio Signal has no STFT data!')

        if len(self.selections) <= 0:
            logger.warn('No Selections!')
            return nussl.separation.BinaryMask.ones(audio_signal.stft_data.shape)

        # TODO: Kludge. This triage is a mess
        if 'spectrogram' in self.target:
            # final_mask = nussl.separation.BinaryMask.zeros(audio_signal.stft_data.shape)
            final_mask = np.zeros_like(audio_signal.get_stft_channel(0), dtype=float)
            for sel in self.selections:
                mask = sel.make_mask(audio_signal.time_bins_vector, audio_signal.freq_vector)
                final_mask += mask

            final_mask = np.clip(final_mask, a_min=0.0, a_max=1.0)

        elif 'ft2d' in self.target:
            ft2d_preview = session.ft2d.ft2d_preview
            ft2d = session.ft2d.ft2d
            final_mask = np.zeros_like(ft2d).astype('float')

            for sel in self.selections:
                mask = sel.make_mask(np.arange(ft2d_preview.shape[1]), np.arange(ft2d_preview.shape[0]))
                mask = scipy.ndimage.zoom(mask, zoom=1.0/session.ft2d.zoom_ratio)
                mask = np.vstack([np.flipud(mask)[1:, :], mask])
                mask = np.hstack([np.fliplr(mask)[:, 1:], mask])
                mask = np.fft.ifftshift(mask)
                final_mask += mask

        elif 'duet' in self.target:
            final_mask = np.zeros_like(audio_signal.get_stft_channel(0), dtype=float)
            ad_hist = session.duet.atn_delay_hist
            for sel in self.selections:
                mask = sel.make_mask(np.linspace(-3, 3, ad_hist.shape[1]), np.linspace(-3, 3, ad_hist.shape[0]))
                applied_mask = ad_hist * mask
                peaks = nussl.find_peak_indices(applied_mask, 1)
                peaks.append(nussl.find_peak_indices(ad_hist * np.logical_not(mask), 1)[0])
                # peaks = zip(*np.where(mask))
                # session.duet.duet.num_sources = 1
                duet_mask = session.duet.duet.convert_peaks_to_masks(peak_indices=peaks)[1]
                final_mask += duet_mask.get_channel(0)

        else:
            raise ActionException('Unknown target: {}!'.format(self.target))

        final_mask = np.clip(final_mask, a_min=0.0, a_max=1.0)
        final_mask = final_mask > 0.5
        # self._plot_mask(final_mask, os.path.join(session.user_original_file_folder, 'final_mask.png'))
        final_mask = nussl.separation.BinaryMask(input_mask=final_mask)
        # final_mask = final_mask.invert_mask()
        # self.masks.append(final_mask)
        return final_mask

    @staticmethod
    def _plot_mask(mask, path):
        plt.close('all')
        plt.imshow(mask, interpolation=None)
        plt.title('shape = {}'.format(mask.shape))
        plt.gca().invert_yaxis()
        logger.info('Saving mask image at {}'.format(path))
        plt.savefig(path)

    def apply_action(self, session):

        audio_signal = session.user_general_audio.audio_signal_copy

        if not audio_signal.has_stft_data:
            raise Exception('Audio Signal has no STFT data!')

        if len(self.selections) <= 0:
            logger.warn('No Selections!')
            self.masks = [nussl.separation.BinaryMask.ones(audio_signal.stft_data.shape)]

        if len(self.masks) <= 0:
            self.make_mask_for_action(audio_signal)

        # TODO: Kludge. This triage is a mess
        if 'spectrogram' in self.target or 'duet' in self.target:
            return audio_signal.apply_mask(self.masks[0])

        elif 'ft2d' in self.target:
            mask = self.masks[0].get_channel(0)
            ft2d = session.ft2d.ft2d
            p = session.user_original_file_folder

            fg_inverted  = np.fft.ifft2(np.multiply(mask, ft2d))
            bg_inverted  = np.fft.ifft2(np.multiply(1 - mask, ft2d))

            bg_mask = bg_inverted > fg_inverted  # hard mask
            fg_mask = 1 - bg_mask

            # self._plot_mask(bg_mask, os.path.join(p, 'bg_mask.png'))
            # self._plot_mask(fg_mask, os.path.join(p, 'fg_mask.png'))

            fg_stft = np.multiply(fg_mask, audio_signal.get_stft_channel(0))
            bg_stft = np.multiply(bg_mask, audio_signal.get_stft_channel(0))

            if type(self) != RemoveAllButSelections:
                stft = fg_stft
            else:
                stft = bg_stft

            # self._plot_mask(np.add(librosa.logamplitude(np.abs(stft)**2, ref_power=np.max).astype('int8'), 80),
            #                 os.path.join(p, 'final_stft.png'))
            # self._plot_mask(np.add(librosa.logamplitude(np.abs(audio_signal.get_stft_channel(0))**2, ref_power=np.max).astype('int8'), 80),
            #                             os.path.join(p, 'original_stft.png'))

            return audio_signal.make_copy_with_stft_data(np.expand_dims(stft, axis=-1))



class RemoveAllButSelections(SelectionBasedRemove):

    def __init__(self, action_dict, action_id):
        super(RemoveAllButSelections, self).__init__(action_dict=action_dict, action_id=action_id)

    def make_mask_for_action(self, audio_signal):
        final_mask = super(RemoveAllButSelections, self).make_mask_for_action(audio_signal)
        self.masks.append(final_mask)


class RemoveSelections(SelectionBasedRemove):

    def __init__(self, action_dict, action_id):
        super(RemoveSelections, self).__init__(action_dict=action_dict, action_id=action_id)

    def make_mask_for_action(self, audio_signal):
        final_mask = super(RemoveSelections, self).make_mask_for_action(audio_signal)
        self.masks.append(final_mask.inverse_mask())


class ActionException(Exception):
    def __init__(self, msg):
        super(ActionException, self).__init__(msg)