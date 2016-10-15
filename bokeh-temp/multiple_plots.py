import nussl
import librosa
import numpy as np
from bokeh.io import curdoc
from bokeh.plotting import figure, show, output_file
from bokeh.embed import components
from bokeh.models import ColumnDataSource, Range1d
from bokeh.layouts import widgetbox, row, column
from bokeh.models.widgets import Button
from bokeh.resources import INLINE

beat_spec_source = ColumnDataSource(data=dict(x=[], y=[]))
spectrogram_source = ColumnDataSource(data=dict(s=[]))
button = Button(label='Get beat spectrum data', button_type="success")
inputs = widgetbox(button)

path = '../tmp/audio/police_noisy.wav'
sig = nussl.AudioSignal(path)
stft = sig.stft()

# def main():

TOOLS = 'box_select,box_zoom,lasso_select,pan,wheel_zoom,undo,redo,reset'
dur = 10
max_ = 10000

beat_spectrum_fig = figure(plot_width=900, plot_height=500,
                           x_range=(0, dur), y_range=(0, max_),
                           title='Repet Beat Spectrum', tools=TOOLS)

beat_spectrum_fig.line('x', 'y', source=beat_spec_source)
beat_spectrum_fig.xaxis.axis_label = 'Time (s)'
beat_spectrum_fig.yaxis.axis_label = 'Beat Strength'
beat_spectrum_fig.toolbar.logo = None

spectrogram_plot = figure(plot_width=900, plot_height=500,
                          x_range=(0, sig.signal_duration), y_range=(0, np.max(sig.freq_vector)),
                          tools=TOOLS)

# spectrogram_plot.image(source=spectrogram_source, x=0, y=0, dw=dur, dh=max_, palette='Magma10')
spectrogram_plot.xaxis.axis_label = 'Time (s)'
spectrogram_plot.yaxis.axis_label = 'Frequency (Hz)'
spectrogram_plot.toolbar.logo = None

curdoc().add_root(column(inputs, beat_spectrum_fig, spectrogram_plot, width=2200))


def get_data():
    r = nussl.Repet(sig)
    bs = r.get_beat_spectrum()
    t = np.linspace(0.0, sig.signal_duration, num=len(bs))
    beat_spec_source.data = dict(x=t, y=bs)
    beat_spectrum_fig.x_range.end = sig.signal_duration
    beat_spectrum_fig.y_range.end = np.max(bs) * 1.1
    beat_spectrum_fig.title.text = 'Repet Beat Spectrum for {}'.format(sig.file_name)

    spec = librosa.logamplitude(np.abs(stft) ** 2, ref_power=np.max)[:, :, 0]
    spec_small = np.array(spec + 80, dtype=np.uint8)
    spectrogram_source.data = dict(s=spec_small)
    spectrogram_plot.image(image=[spec_small], x=0, y=0, dw=sig.signal_duration, dh=np.max(sig.freq_vector),
            palette='Magma10')
    spectrogram_plot.x_range.end = sig.signal_duration
    spectrogram_plot.y_range.end = np.max(sig.freq_vector)

button.on_click(get_data)



# if __name__ == '__main__':
#     main()