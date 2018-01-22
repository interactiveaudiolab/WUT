# coding=utf-8
"""
DUET tasks in here
"""
import json
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

    def get_ad_histogram_json(self):
        self.atn_delay_hist = self.duet.get_atn_delay_histogram(recompute=True, normalized=True)
        self.atn_delay_hist *= 80
        self.atn_delay_hist = self.atn_delay_hist.T
        return json.dumps(self.atn_delay_hist.tolist())
