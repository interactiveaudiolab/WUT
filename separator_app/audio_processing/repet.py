# coding=utf-8
"""
All toy_audio processing for Repet (Original) happens here.
"""
import source_separation
# import nussl
import numpy as np
# from bokeh.resources import CDN
# from bokeh.plotting import figure
# from bokeh.embed import file_html

from flask import jsonify


class Repet(source_separation.SourceSeparation):

    def __init__(self, audio_signal):
        source_separation.SourceSeparation.__init__(self, audio_signal=audio_signal)
        super(source_separation.SourceSeparation, self).__init__()
        # super(source_separation.SourceSeparation, self).__init__()
        # self.repet_instance = nussl.Repet(self.user_input_audio_signal)

    def get_beat_spectrum(self, start, end):
        start = self.time_to_time_index(start)
        end = self.time_to_time_index(end)
        # self.repet_instance.audio_signal.set_active_region(start, end)
        #
        # return self.repet_instance.get_beat_spectrum()

    def get_beat_spectrum_json(self, start, end):
        beat_spectrum = self.get_beat_spectrum(start, end)
        # entropy, log_mean = self.beat_spectrum_prediction_statistics(beat_spectrum)
        time_vect = self.get_stft_time_vector()

        # beat_and_time = [{'x': time_vect[i], 'y': beat_spectrum[i]} for i in range(len(beat_spectrum))]
        return jsonify({'time': list(time_vect), 'beat': list(beat_spectrum)})
        # return jsonify({'beat_spectrum_data': list(beat_spectrum),
        #                 'start': time_vect[0], 'end': time_vect[-1],
        #                 'entropy': entropy, 'log_mean': log_mean})

    @staticmethod
    def beat_spectrum_prediction_statistics(beat_spectrum):
        beat_spec_norm = beat_spectrum / np.max(beat_spectrum)
        entropy = - sum(p * np.log(p) for p in np.abs(beat_spec_norm)) / len(beat_spec_norm)
        log_mean = np.log(np.mean(beat_spectrum / np.max(beat_spectrum)))

        return entropy, log_mean

    def get_beat_spectrum_figure(self, start, end):
        beat_spectrum = self.get_beat_spectrum(start, end)
        time_vector = self.get_stft_time_vector()
        duration = self.user_input_audio_signal.signal_duration

        # p = figure(plot_width=900, plot_height=500, x_range=(0, duration),
        #            y_range=(0, np.max(beat_spectrum) * 1.1), tools=self._TOOLS)
        #
        # p.line(time_vector, beat_spectrum)
        # p.xaxis.axis_label = 'Time (s)'
        # p.yaxis.axis_label = 'Beat Strength'
        # p.toolbar.logo = None
        #
        # return p

    def get_beat_spectrum_html(self, start, end):
        beat_spectrum = self.get_beat_spectrum_figure(start, end)
        # return file_html(beat_spectrum, CDN)

    def run_repet(self, path_to_file):
        pass
