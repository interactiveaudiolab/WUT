import nussl
import numpy as np
from bokeh.plotting import figure, show, output_file
from bokeh.embed import components
import librosa

def main():
    path = '../tmp/audio/police_noisy.wav'
    sig = nussl.AudioSignal(path)
    stft = sig.stft()
    spec = librosa.logamplitude(np.abs(stft) ** 2, ref_power=np.max)[:, :, 0]
    spec_small = np.array(spec + 80, dtype=np.uint8)

    TOOLS = 'box_select,box_zoom,lasso_select,pan,wheel_zoom,undo,redo,reset'

    p = figure(plot_width=900, plot_height=500, y_axis_type='log',
               x_range=(0, sig.signal_duration), y_range=(0, np.max(sig.freq_vector)),
               tools=TOOLS)

    p.image(image=[spec_small], x=0, y=0, dw=sig.signal_duration, dh=np.max(sig.freq_vector),
            palette='Magma10')
    p.xaxis.axis_label = 'Time (s)'
    p.yaxis.axis_label = 'Frequency (Hz)'
    p.toolbar.logo = None

    script, div = components(p)
    i = 0
    with open('spec_output.txt', 'w') as f:
        f.write(script)
        f.write('\n\n\n')
        f.write(div)


    # output_file('bokeh_spectrogram_test.html')
    # show(p)

if __name__ == '__main__':
    main()