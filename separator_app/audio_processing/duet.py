# coding=utf-8
"""
DUET tasks in here
"""
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO

import logging

import numpy as np
import general_audio
from .. import nussl

logger = logging.getLogger()


class Duet(general_audio.GeneralAudio):
    """

    """

    def __init__(self, audio_signal_object, storage_path):
        super(Duet, self).__init__(audio_signal_object, storage_path)
        self.duet = nussl.Duet(audio_signal_object, 2)
        self.atn_delay_hist = None

    def get_ad_histogram_csv_string(self):
        csv_file_name = '{}_atn_delay_hist.csv'.format(self.audio_signal_copy.file_name)
        self.atn_delay_hist = self.duet.get_atn_delay_histogram(recompute=True, normalized=True)
        self.atn_delay_hist *= 80
        self.atn_delay_hist = self.atn_delay_hist.T

        output = StringIO()
        np.savetxt(output, self.atn_delay_hist, delimiter=',', fmt='%i',
                   header=','.join(['t{}'.format(i) for i in range(self.atn_delay_hist.shape[1])]))
        output.seek(0)
        return output, csv_file_name