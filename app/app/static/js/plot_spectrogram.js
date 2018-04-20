function make_spectrogram(heatmap, results, audioLength) {
    let logY = false;
    let freqMax = 150;

    heatmap.rawData = results;
    heatmap.drawHeatmap(audioLength, freqMax, logY);
}

function getSpectrogramAsImage(heatmap, freqMax) {
    let url = "./spec_image?val=" + Math.random().toString(36).substring(7);
    let duration = mixture_waveform.surfer.backend.getDuration();

    heatmap.drawImage(url, duration, freqMax);
}

class SpectrogramHeatmap extends PlotlyHeatmap {
    constructor(divID, yMax) {
        super(divID);

        yMax = yMax !== undefined ? yMax : 20000.0;
        this.audioLength = null;
        this.freqMax = null;

        let newLayout = {
            xaxis: { title: "Time (s)" },
            yaxis: {
                title: "Frequency (Hz)",
                range: [0.0, yMax]
            }
        };

        // merges super and child layouts
        // overlapping fields clobbered by child
        _.merge(this.plotLayout, newLayout);

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            if(data || data.range) { $('#apply-spec-selection').removeClass('disabled') }
        });

        this.emptyHeatmap();
    }

    drawHeatmap(audioLength, freqMax, logY) {
        this.audioLength = audioLength;
        this.freqMax = freqMax;
        this.logY = logY;

        let xTicks = arange(0.0, this.audioLength, this.rawData[0].length);
        let yTicks = arange(0.0, this.freqMax, this.rawData.length);

        let data = [ { x: xTicks, y: yTicks, z: this.rawData, type: 'heatmapgl', showscale: false } ];

        let layout = this.plotLayout;
        layout.xaxis.range = [0.0, this.audioLength];
        // layout.xaxis.rangeslider = [0.0, this.audioLength];
        layout.yaxis.type = this.logY ? "log" : "linear";
        layout.yaxis.autorange = this.logY;
        // TODO: why divide by 2 here? also just how does this work in general
        layout.yaxis.range = [0.0, this.freqMax];

        this.plot = Plotly.newPlot(this.divID, data, layout, this.plotOptions);
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

        this.plot = Plotly.newPlot(this.divID, [{ x: [], y: [] }], layout, this.plotOptions)
            .then(() => {
                $('#spectrogram-spinner').hide();
                $('.shared-spectogram-spinner').show();
                $('#spectrogram-container').css('display', 'flex');

                relayoutPlots();
            });
    }
}