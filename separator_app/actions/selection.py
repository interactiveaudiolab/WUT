
import numbers

import numpy as np
from .. import nussl

class Selection(object):

    DATA_TYPE = 'dataType'
    DATA = 'data'
    KEYS_SET = {DATA_TYPE, DATA}

    def __init__(self):
        pass

    @property
    def subclasses(self):
        return vars()[self.__name__].__subclasses__()

    @property
    def known_selection_types(self):
        return self.subclasses

    def __str__(self):
        return self.__name__

    @staticmethod
    def new_selection_instance(selection_dict):
        if Selection.DATA_TYPE not in selection_dict or \
                        selection_dict[Selection.DATA_TYPE] not in Selection.subclasses:
            raise ValueError('No {} in selection_dict or {} is wrong type!'.format(Selection.DATA_TYPE,
                                                                                   Selection.DATA_TYPE))

        selection_type = selection_dict[Selection.DATA_TYPE]

        return vars()[selection_type](selection_dict)

    def make_mask(self, time_vector, freq_vector, mask_type=nussl.separation.BinaryMask):
        raise NotImplemented


class BoxSelection(Selection):

    TIME_START = 'xStart'
    TIME_END = 'xEnd'
    FREQ_START = 'yStart'
    FREQ_END = 'yEnd'
    DATA_KEYS_SET = {TIME_START, TIME_END, FREQ_START, FREQ_END}

    def __init__(self, selection_dict=None, time_start=None, time_end=None, freq_start=None, freq_end=None):
        super(BoxSelection, self).__init__()

        self.time_start = None
        self.time_end = None
        self.freq_start = None
        self.freq_end = None
        self.mask = None

        if selection_dict:
            self.init_from_dict(selection_dict)

        elif all(isinstance(v, numbers.Real) for v in [time_start, time_end, freq_start, freq_end]):
            self.time_start = time_start
            self.time_end = time_end
            self.freq_start = freq_start
            self.freq_end = freq_end

        else:
            raise ValueError('BoxSelection initialized wrong!')

    def __str__(self):
        return self.__name__

    @property
    def is_initialized(self):
        return all(isinstance(v, numbers.Real) for v in [self.time_start, self.time_end,
                                                         self.freq_start, self.freq_end])

    def init_from_dict(self, selection_dict):
        if not isinstance(selection_dict, dict):
            raise ValueError('selection_dict not a dictionary!')

        if self.DATA_TYPE not in selection_dict or selection_dict[self.DATA_TYPE] != str(self):
            raise ValueError('No {} in selection_dict or {} is wrong type!'.format(self.DATA_TYPE, self.DATA_TYPE))

        if set(selection_dict.keys()) != self.KEYS_SET:
            raise ValueError('selection_dict keys not correct!')

        if not isinstance(selection_dict[self.DATA], dict):
            raise ValueError('selection_dict[\'data\'] is not a dict!')

        if set(selection_dict[self.DATA].keys()) != self.DATA_KEYS_SET:
            raise ValueError('selection_dict[\'data\'] keys not correct!')

        if not all(isinstance(v, numbers.Real) for v in selection_dict[self.DATA].values()):
            raise ValueError('Not all values in selection_dict[\'data\'] are numbers!')

        self.time_start = selection_dict[self.DATA][self.TIME_START]
        self.time_end = selection_dict[self.DATA][self.TIME_END]
        self.freq_start = selection_dict[self.DATA][self.FREQ_START]
        self.freq_end = selection_dict[self.DATA][self.FREQ_END]

    def make_mask(self, time_vector, freq_vector, mask_type=nussl.separation.BinaryMask):
        if mask_type == nussl.separation.BinaryMask:
            new_mask = nussl.separation.BinaryMask(np.zeros((len(freq_vector), len(time_vector))))
        else:
            new_mask = nussl.separation.SoftMask(np.zeros((len(freq_vector), len(time_vector))))

        time_start_idx = (np.abs(time_vector - self.time_start)).argmin()
        time_end_idx = (np.abs(time_vector - self.time_end)).argmin()
        freq_start_idx = (np.abs(freq_vector - self.freq_start)).argmin()
        freq_end_idx = (np.abs(freq_vector - self.freq_end)).argmin()

        new_mask[freq_start_idx:freq_end_idx, time_start_idx:time_end_idx] = 1
