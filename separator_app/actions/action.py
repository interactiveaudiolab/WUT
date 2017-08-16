# coding=utf-8
"""

"""


from .. import nussl
from . import selection


class Action(object):
    """
    Encodes an action made by the user from the client side.
    """
    # TODO: eventually change this to: `vars()[self.__name__].__subclasses__()`
    KNOWN_ACTIONS = ['RemoveAllButSelections', 'RemoveSelections']
    ACTION_TYPE = 'actionType'
    DATA = 'data'

    def __init__(self, action_dict):
        self.action_dict = None
        if self.is_action_dict_valid(action_dict):
            self.action_dict = action_dict
        else:
            raise ValueError('Invalid action_dict!')

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

    def apply_action(self, audio_signal):
        raise NotImplemented

    @staticmethod
    def new_action(action_dict):
        if Action.ACTION_TYPE not in action_dict or action_dict[Action.ACTION_TYPE] not in Action.subclasses:
            raise ValueError('No {} in action_dict or {} is wrong type!'.format(Action.ACTION_TYPE, Action.ACTION_TYPE))

        action_type = action_dict[Action.ACTION_TYPE]

        return vars()[action_type](action_dict)


class RemoveAllButSelections(Action):

    SELECTION_DATA = 'selectionData'
    VALID_SELECTION_TYPES = [selection.BoxSelection]

    def __str__(self):
        return self.__name__

    def __init__(self, action_dict):
        super(RemoveAllButSelections, self).__init__(action_dict=action_dict)
        self.init_action(action_dict)

    def is_action_dict_valid(self, action_dict):
        if not super(RemoveAllButSelections, self).is_action_dict_valid(action_dict):
            return False

        if self.ACTION_TYPE not in action_dict or action_dict[self.ACTION_TYPE] != str(self):
            return False

        if not self.SELECTION_DATA in action_dict and not isinstance(action_dict[self.SELECTION_DATA], dict):
            return False

        return True

    def init_action(self, action_dict):
        selection_data = action_dict[self.SELECTION_DATA]

        for sel in selection_data:
            new_selection = selection.Selection.new_selection_instance(sel)
            self.selections.append(new_selection)

    def apply_action(self, audio_signal):

        final_mask = nussl.separation.BinaryMask(audio_signal.stft_data.shape)
        for sel in self.selections:
            mask = sel.make_mask(audio_signal.time_bins_vector, audio_signal.freq_vector)
            final_mask += mask
            # mask = mask.invert_mask()

        final_mask = final_mask.invert_mask()
        return audio_signal.apply_mask(final_mask)
