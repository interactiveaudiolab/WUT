import nussl
import numpy as np
from bokeh.io import curdoc
from bokeh.plotting import figure, show, output_file
from bokeh.embed import components
from bokeh.models import ColumnDataSource, Range1d
from bokeh.layouts import widgetbox, row
from bokeh.models.widgets import Button
from bokeh.resources import INLINE

source = ColumnDataSource(data=dict(x=[], y=[]))
button = Button(label='Get beat spectrum data', button_type="success")
inputs = widgetbox(button)

# def main():

TOOLS = 'box_select,box_zoom,lasso_select,pan,wheel_zoom,undo,redo,reset'
dur = 10
max_ = 10000

p = figure(plot_width=900, plot_height=500,
           x_range=(0, dur), y_range=(0, max_),
           title='Repet Beat Spectrum', tools=TOOLS)

p.line('x', 'y', source=source)
p.xaxis.axis_label = 'Time (s)'
p.yaxis.axis_label = 'Beat Strength'
p.toolbar.logo = None

curdoc().add_root(row(inputs, p, width=1100))

    # script, div = components(p)
    # with open('repet_output_empty.txt', 'w') as f:
    #     f.write(script)
    #     f.write('\n\n\n')
    #     f.write(div)

    # output_file('bokeh_beat_spectrum_test.html')
    # show(p)


def get_bs_data():
    path = '../tmp/toy_audio/police_noisy.wav'
    sig = nussl.AudioSignal(path)
    r = nussl.Repet(sig)
    bs = r.get_beat_spectrum()
    t = np.linspace(0.0, sig.signal_duration, num=len(bs))
    source.data = dict(x=t, y=bs)
    p.x_range.end = sig.signal_duration
    p.y_range.end = np.max(bs) * 1.1
    p.title.text = 'Repet Beat Spectrum for {}'.format(sig.file_name)

button.on_click(get_bs_data)


# if __name__ == '__main__':
#     main()