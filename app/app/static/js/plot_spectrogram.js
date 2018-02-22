
// import PlotlyHeatmap from "plotly_plots.js";

function make_spectrogram(heatmap, results, audioLength) {
    // var logY = document.getElementById('yLogCheckbox').checked;
    // if (typeof(logY) === 'undefined') logY = false;
    let logY = false;
    let freqMax = 150;

    console.log('Got spectrogram from server!');
    let status = $('#general-status');
    status.text('Drawing Spectrogram...');

    heatmap.rawData = results;
    heatmap.drawHeatmap(audioLength, freqMax, logY);
    // enableTools(true, '.spec-tool');

    status.text('Ready...');
}

function getSpectrogramAsImage(heatmap, freqMax) {
    let url = "./spec_image?val=" + Math.random().toString(36).substring(7);
    let duration = mixture_waveform.backend.getDuration();

    heatmap.drawImage(url, duration, freqMax);
    enableTools(true, '.spec-tool');

}

class SpectrogramHeatmap extends PlotlyHeatmap {

    constructor(divID, yMax) {
        super(divID, yMax);
        this.audioLength = null;
        this.freqMax = null;

        this.plotLayout.xaxis = {
            title: "Time (s)",
            type: "linear",
            range: [0.0, 1.0],
            // rangeslider: [0.0, 1.0]
        };

        this.plotLayout.yaxis = {
            title: "Frequency (Hz)",
            type: "linear",
            autorange: true,
            range: [0.0, 20000.0]
        };

        this.emptyHeatmap();
    }

    drawHeatmap(audioLength, freqMax, logY) {
        this.audioLength = audioLength;
        this.freqMax = freqMax;
        this.logY = logY;

        this.yTicks = arange(0.0, this.freqMax, this.rawData.length);
        this.xTicks = arange(0.0, this.audioLength, this.rawData[0].length);

        let data = [ { x: this.xTicks, y: this.yTicks, z: this.rawData, type: 'heatmap', showscale: false } ];

        let layout = this.plotLayout;
        layout.xaxis.range = [0.0, this.audioLength];
        // layout.xaxis.rangeslider = [0.0, this.audioLength];
        layout.yaxis.type = this.logY ? "log" : "linear";
        layout.yaxis.autorange = this.logY;
        // TODO: why divide by 2 here? also just how does this work in general
        layout.yaxis.range = [0.0, this.freqMax];

        this.plot = Plotly.newPlot(this.divID, data, layout, this.plotOptions);
        // let update = { width: $(window).width() };
        // Plotly.relayout(this.divID, update);

    }

    drawImage(url, duration, freqMax) {

        let layout = this.plotLayout;
        layout.xaxis.range = [0.0, duration];
        layout.yaxis.range = [0.0, freqMax];
        layout.yaxis.autorange = false;

        layout.images = [{
            "source": url,
            "xref": "x",
            "yref": "y",
            "x": 0,
            "y": 0,
            "sizex": duration,
            "sizey": freqMax,
            "xanchor": "left",
            "yanchor": "bottom",
            "sizing": "stretch"
        }];

        this.plot = Plotly.newPlot(this.divID, [{ x: [], y: [] }], layout, this.plotOptions);
        let update = { width: $(window).width() };
        Plotly.relayout(this.divID, update);
    }
}