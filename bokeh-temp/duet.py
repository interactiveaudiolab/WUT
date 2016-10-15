import nussl
import numpy as np
from bokeh.plotting import figure, show, output_file
from bokeh.models import images

def main():
    path = '../tmp/audio/dev1_female3_synthconv_130ms_5cm_mix.wav'
    sig = nussl.AudioSignal(path)
    d = nussl.Duet(sig, 2)
    d()
    hist = d.hist

    TOOLS = 'box_select,box_zoom,lasso_select,pan,wheel_zoom,undo,redo,reset'

    p = figure(plot_width=500, plot_height=500,
               x_range=(0, 50), y_range=(0, 50),
               title='DUET histogram for {}'.format(sig.file_name), tools=TOOLS)

    p.image(image=[hist], x=0, y=0, dw=50, dh=50,
            palette='PiYG9')

    p.xaxis.axis_label = 'Attenuation'
    p.yaxis.axis_label = 'Delay'
    p.toolbar.logo = None

    output_file('bokeh_duet_hist_test.html')
    show(p)

if __name__ == '__main__':
    main()