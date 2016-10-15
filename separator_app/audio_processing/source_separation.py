# coding=utf-8
"""
SourceSeparation object controls everything
"""
import numpy as np
import json
import copy
import nussl
import librosa
import bokeh
from bokeh.resources import CDN
from bokeh.plotting import figure
from bokeh.embed import components
from bokeh.embed import autoload_static
from bokeh.embed import file_html
from multiprocessing import Pool
# import plotly


class SourceSeparation(object):
    _needs_special_encoding = ['user_input_audio_signal']
    _TOOLS = 'box_select,box_zoom,lasso_select,pan,wheel_zoom,undo,redo,reset'

    def __init__(self, audio_signal):
        self.user_input_audio_signal = audio_signal
        self.do_stft()
        self.stft_time_vector = self.get_stft_time_vector()

    def get_stft_time_vector(self):
        return np.linspace(0.0, self.user_input_audio_signal.signal_duration,
                           num=self.user_input_audio_signal.stft_length)

    def do_stft(self):
        return self.user_input_audio_signal.stft(overwrite=True)

    @property
    def stft_end(self):
        return self.stft_time_vector[-1]

    def time_to_stft_index(self, time):
        """
        transforms a time in seconds into stft bins
        :param time:
        :return:
        """
        time = float(time)
        norm_time = time / self.user_input_audio_signal.signal_duration
        return int(norm_time * self.user_input_audio_signal.stft_length)

    def time_to_time_index(self, time):
        """

        :param time:
        :return:
        """
        time = float(time)
        norm_time = time / self.user_input_audio_signal.signal_duration
        return int(norm_time * self.user_input_audio_signal.signal_length)

    def get_power_spectrogram_data(self, ch):
        stft = self.user_input_audio_signal.get_stft_channel(ch)
        spec = librosa.logamplitude(np.abs(stft) ** 2, ref_power=np.max)
        return spec

    def get_power_spectrogram_figure(self, ch):
        power_spectrogram_data = self.get_power_spectrogram_data(ch)
        power_spectrogram_small = np.array(power_spectrogram_data + 80, dtype=np.uint8)
        sig_dur = self.user_input_audio_signal.signal_duration
        max_freq = np.max(self.user_input_audio_signal.freq_vector)

        p = figure(plot_width=900, plot_height=500, y_axis_type='log',
                   x_range=(0, sig_dur), y_range=(0, max_freq),
                   tools=self._TOOLS)

        p.image(image=[power_spectrogram_small], x=0, y=0, dw=sig_dur, dh=max_freq, palette='Magma10')
        p.xaxis.axis_label = 'Time (s)'
        p.yaxis.axis_label = 'Frequency (Hz)'
        p.toolbar.logo = None

        return p

    def get_power_spectrogram_html(self, ch):
        plot = self.get_power_spectrogram_figure(ch)
        return file_html(plot, CDN)

    def to_json(self):
        return json.dumps(self, default=self._to_json_helper)

    def _to_json_helper(self, o):
        if not isinstance(o, SourceSeparation):
            raise TypeError

        d = copy.copy(o.__dict__)
        for k, v in d.iteritems():
            if k in self._needs_special_encoding and v is not None:
                d[k] = v.to_json()
            elif isinstance(v, np.ndarray):
                d[k] = nussl.json_ready_numpy_array(v)
        d['__class__'] = o.__class__.__name__
        d['__module__'] = o.__module__
        return d

    @staticmethod
    def from_json(json_string):
        return json.loads(json_string, object_hook=SourceSeparation._from_json_helper)

    @staticmethod
    def _from_json_helper(json_dict):
        if '__class__' in json_dict:
            class_name = json_dict.pop('__class__')
            module = json_dict.pop('__module__')
            if class_name != SourceSeparation.__name__ or module != SourceSeparation.__module__:
                raise TypeError

            audio_sig = json_dict.pop('user_input_audio_signal')
            audio_sig = nussl.AudioSignal.from_json(audio_sig)
            s = SourceSeparation(audio_sig)
            for k, v in json_dict.items():
                if v is not None and isinstance(v, basestring):
                    if nussl.AudioSignal.__name__ in v:
                        s.__dict__[k] = nussl.AudioSignal.from_json(v)
                    elif any([cls.__name__ in v for cls in nussl.SeparationBase.__subclasses__()]):
                        s.__dict__[k] = nussl.SeparationBase.from_json(v)
                elif isinstance(v, dict) and nussl.constants.NUMPY_JSON_KEY in v:
                    s.__dict__[k] = nussl.json_numpy_obj_hook(v[nussl.constants.NUMPY_JSON_KEY])
                else:
                    s.__dict__[k] = v if not isinstance(v, unicode) else v.encode('ascii')
            return s
        else:
            return json_dict
