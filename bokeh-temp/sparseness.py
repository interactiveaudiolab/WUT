from bokeh.plotting import figure
from bokeh.charts import Step, show, output_file
from bokeh.models import Range1d
import nussl
import numpy as np
import librosa


def main():
    path = '../sparseness/layered_song3.wav'
    sig = nussl.AudioSignal(path)
    sig.to_mono(overwrite=True)
    stft = sig.stft()
    ps = np.array(librosa.logamplitude(np.abs(stft) ** 2, ref_power=np.max), dtype='int8') + 80

    step_size = 25

    power_sparsity = []
    for step in np.arange(step_size, sig.stft_length, step_size):
        step_sub = ps[:, step - step_size: step, 0]
        power_sparsity.append(np.sum(step_sub))

    power_sparsity = np.array(power_sparsity)
    data = dict(ps=power_sparsity, time=np.arange(0, sig.signal_duration, sig.signal_duration / len(power_sparsity)))

    TOOLS = 'box_select,box_zoom,lasso_select,pan,wheel_zoom,undo,redo,reset'



    line = Step(data, y=['ps'], #  x=['time'],
                title="Sparseness", ylabel='Business', tools=TOOLS, x_range=Range1d(start=0, end=sig.signal_duration))


    p = figure(plot_width=500, plot_height=500,
               x_range=(0, 50), y_range=(0, 50),
               title='DUET histogram for {}'.format(sig.file_name), tools=TOOLS)


    output_file("sparseness.html", title="sparseness example")

    show(line)


if __name__ == '__main__':
    main()