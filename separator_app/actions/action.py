# coding=utf-8
"""

"""
import logging

import numpy as np

from .. import nussl
from . import selection


logger = logging.getLogger()


class Action(object):
    """
    Encodes an action made by the user from the client side.
    """
    # TODO: eventually change this to: `vars()[self.__name__].__subclasses__()`
    KNOWN_ACTIONS = ['RemoveAllButSelections', 'RemoveSelections']
    ACTION_TYPE = 'actionType'
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

    def make_mask_for_action(self, audio_signal):
        raise NotImplemented

    def apply_action(self, audio_signal):
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

        return True

    def init_action(self):
        for sel in self.data_dict[self.SELECTION_DATA]:
            new_selection = selection.Selection.new_selection_instance(sel)
            self.selections.append(new_selection)

    def make_mask_for_action(self, audio_signal):

        if not audio_signal.has_stft_data:
            raise Exception('Audio Signal has no STFT data!')

        if len(self.selections) <= 0:
            logger.warn('No Selections!')
            return nussl.separation.BinaryMask.ones(audio_signal.stft_data.shape)

        # final_mask = nussl.separation.BinaryMask.zeros(audio_signal.stft_data.shape)
        final_mask = np.zeros_like(audio_signal.get_stft_channel(0), dtype=float)
        for sel in self.selections:
            mask = sel.make_mask(audio_signal.time_bins_vector, audio_signal.freq_vector)
            final_mask += mask

        final_mask = np.clip(final_mask, a_min=0.0, a_max=1.0)
        final_mask = nussl.separation.BinaryMask(input_mask=final_mask)
        # final_mask = final_mask.invert_mask()
        # self.masks.append(final_mask)
        return final_mask

    def apply_action(self, audio_signal):

        if not audio_signal.has_stft_data:
            raise Exception('Audio Signal has no STFT data!')

        if len(self.selections) <= 0:
            logger.warn('No Selections!')
            return nussl.separation.BinaryMask.ones(audio_signal.stft_data.shape)

        if len(self.masks) <= 0:
            self.make_mask_for_action(audio_signal)

        return audio_signal.apply_mask(self.masks[0])


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
