function getMelScatterSpectrogramAsImage(heatmap, xaxisRange, freqMax) {
    let url = "./mel_spec_image?val=" + Math.random().toString(36).substring(7);

    let duration = mixture_waveform.backend.getDuration();
    heatmap.drawImage(url, xaxisRange, freqMax, duration);
}

function getSpectrogramAsImage(heatmap, xaxisRange, freqMax) {
    let url = "./spec_image?val=" + Math.random().toString(36).substring(7);
    let duration = mixture_waveform.backend.getDuration();

    heatmap.drawImage(url, xaxisRange, freqMax, duration);
    enableTools(true, '.spec-tool');
}


class ScatterSpectrogram extends PlotlyHeatmap {
    constructor(divID, yMax) {
        super(divID, yMax);
        this.audioLength = null;
        this.freqMax = null;

        this.plotLayout.hovermode = false;

        this.plotMargins = {
            l: 50,
            r: 10,
            b: 50,
            t: 10
        };

        this.plotLayout = {
            xaxis: {
                title: "Time (s)",
                type: "linear",
                range: [0.0, 1.0],
                showgrid: false
            },
            yaxis: {
                title: "Frequency (Mel)",
                type: "linear",
                autorange: true,
                range: [0.0, 150],
                showgrid: false
            },
            margin: this.plotMargins
        };

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            if(!data || !data.range) { this.clearMarkers(); }
        });

        // maybe somehow deal with duplicate markers?
        // for now just add them on top
        this.markers = []

        this.emptyHeatmap();
    }

    clearMarkers() {
        this.markers = []
        let data = [{x:[], y:[]}];
        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
    }

    addMarkers(x_marks, y_marks, color) {
        // let data = [{x:[], y:[], type:'scattergl',
        //         mode:'markers', marker: { symbol: "square", size:5, color: '#ffffff', opacity: 1 }}];
        let coords = x_marks.map((x, i) => [x, y_marks[i]])
        this.markers = this.markers.concat(coords)

        Plotly.addTraces(spectrogram.divID, { x: x_marks, y: y_marks, type: 'scattergl',
            mode:'markers', marker: { size: 2, color: (color !== undefined ? color : '#ffffff'), opacity: 1 }});
    }

    // returns TF mel matrix with 1s in all TF bins
    // currently selected
    exportSelectionMask() {
        let matrix = [...new Array(this.dims[1])].map(() => [... new Array(this.dims[0])].map(() => 0))
        this.markers.forEach(([x, y]) => { matrix[x][y] = 1 });
        return matrix;
    }

    drawImage(url, xaxisRange, freqMax, duration) {
        this.plotLayout.xaxis.range = [0.0, xaxisRange];

        this.plotLayout.yaxis.range = [0.0, freqMax];
        this.plotLayout.yaxis.autorange = false;
        this.plotLayout.hovermode = false;

        let [locs, text] = generateTicks(xaxisRange, duration);
        this.plotLayout.xaxis.tickmode = 'array';
        this.plotLayout.xaxis.tickvals = locs;
        this.plotLayout.xaxis.ticktext = text;

        this.plotLayout.images = [{
            "source": url,
            "xref": "x",
            "yref": "y",
            "x": 0,
            "y": 0,
            "sizex": xaxisRange,
            "sizey": freqMax,
            "xanchor": "left",
            "yanchor": "bottom",
            "sizing": "stretch",
            "layer": "below"
        }];

        let data = [{x:[], y:[]}];
        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions)
            .then(() => {
                $('#apply-selections').removeClass('disabled');
                $('.plots-spinner').hide();
                $('#pca').show();
                $('#spectrogram').show();
                relayoutPlots();
            });
    }
}