function make_atn_delay_hist(results) {
    console.log('Got Attenuation/Delay histogram!');
    let status = $('#general-status');
    status.text('Drawing Attenuation/Delay Histogram...');
    duet_histogram.rawData = results;
    duet_histogram.drawHeatmap();
    enableTools(true, '.duet-tool');

    status.text('Ready...');
}

class AttenuationDelayHistogram extends PlotlyHeatmap {
    constructor(divID, yMax) {
        super(divID, yMax);
        this.min = -3.0;
        this.max = 3.0;

        this.plotLayout.xaxis = {
            title: "Inter-channel Attenuation Difference",
            type: "linear",
            range: [this.min, this.max],
        };
        this.plotLayout.yaxis = {
            title: "Inter-channel Delay Difference",
            type: "linear",
            autorange: true,
            range: [this.min, this.max]
        };

        this.emptyHeatmap();
    }

    drawHeatmap(audioLength, freqMax, logY) {
        let xTicks = arange(this.min, this.max, this.rawData[0].length);
        let yTicks = arange(this.min, this.max, this.rawData.length);

        let data = [ { x: xTicks, y: yTicks, z: this.rawData, type: 'heatmap', showscale: false } ];

        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
        Plotly.relayout(this.divID, { width: this.DOMObject.width() });
    }
}