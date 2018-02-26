function getMelScatterSpectrogramAsImage(heatmap, path, freqMax) {
    let url = "./mel_spec_image";
    // duration currently hardcoded in for toy data
    heatmap.drawImage(url, 1293, 150);
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
        };

        this.plotLayout.yaxis = {
            title: "Frequency (Mel)",
            type: "linear",
            autorange: true,
            range: [0.0, 150]
        };

        this.emptyHeatmap();
    }

    drawImage(url, duration, freqMax) {
        let layout = this.plotLayout;
        layout.xaxis.range = [0.0, 1293];
        layout.yaxis.range = [0.0, 150];
        layout.yaxis.autorange = false;
        layout.hovermode = false;
        layout.showgrid = false;
        layout.xaxis.showgrid = false;
        layout.yaxis.showgrid = false;
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

        let data = [{x:[], y:[], type:'scattergl',
                mode:'markers', marker: { symbol: "square", size:5, color: '#ffffff', opacity: 1 }}];
        this.plot = Plotly.newPlot(this.divID, data, layout, this.plotOptions);
    }
}