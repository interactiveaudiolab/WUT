function make_scatter_spectrogram(heatmap, results, audioLength) {
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

function getMelScatterSpectrogramAsImage(heatmap, path, freqMax) {
  let url = "./mel_spec_image";
  // let duration = mixture_waveform.backend.getDuration();
  // let freqMax = 20000;

  heatmap.drawImage(url, 15, 150);
}

class ScatterSpectrogram extends PlotlyHeatmap {

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

        let x = [1, 2, 3, 4, 5, 6];
        let y = [1, 2, 3, 2, 3, 4];
        let colors = ['#00000','#00000','#00000',
                '#00000','#00000','#00000'];
        let data = [{x:x, y:y, type:'scattergl',
                mode:'markers', marker:{size:16, color:colors}, showscale: false}];

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

    addMarkers() {

    }

    drawImage(url, duration, freqMax) {

        let layout = this.plotLayout;
        layout.xaxis.range = [0.0, 1293];
        layout.yaxis.range = [0.0, 150];
        layout.yaxis.autorange = false;
        layout.hovermode = false;
        layout.showgrid = false;
        // layout.scene = {
        //     xaxis: {
        //         showgrid: false
        //     },
        //     yaxis: {
        //         showgrid: false
        //     }
        // }
        layout.xaxis.showgrid = false;
        layout.yaxis.showgrid = false;
        // = {
        //     xaxis: {
        //         showgrid: false
        //     },
        //     yaxis: {
        //         showgrid: false
        //     }
        // }
        layout.images = [{
            "source": url,
            "xref": "x",
            "yref": "y",
            "x": 0,
            "y": 0,
            "sizex": 1293,
            "sizey": 150,
            "xanchor": "left",
            "yanchor": "bottom",
            "sizing": "stretch",
            "layer": "below"
        }];

        // let x = [1, 2, 3, 4, 5, 6];
        // let y = [1, 2, 3, 2, 3, 4];
        // let x = zeros(100000).map((val) => Math.round(1293 * Math.random()));
        // let y = zeros(100000).map((val) => Math.round(150 * Math.random()));
        let data = [{x:[], y:[], type:'scattergl',
                mode:'markers', marker: { size:5, color: '#ffffff', opacity: 1 }}];
                // mode:'markers', marker: { symbol: "square", size:2, color: '#000000', opacity: 0.8 }, showscale: false}];

        this.plot = Plotly.newPlot(this.divID, data, layout, this.plotOptions);
    }
}