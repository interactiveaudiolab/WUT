
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
        this.selected_val = 20;

        this.plotLayout = {

            // Data Formatting
            xaxis: {
                title: "Inter-channel Attenuation Difference",
                type: "linear",
                range: [this.min, this.max],
            },
            yaxis: {
                title: "Inter-channel Delay Difference",
                type: "linear",
                autorange: true,
                range: [this.min, this.max]
            },

            // Interaction
            dragmode: 'select',
            selectable: true,

            // Cosmetics
            paper_bgcolor: '#E3F0FB', // 'rgb(0,0,0,0); doesn't work :(
            plot_bgcolor: '#E3F0FB',
            margin: this.plotMargins,
            autosize: true,

        };

        this.emptyHeatmap();
    }

    drawHeatmap(audioLength, freqMax, logY) {

        this.yTicks = arange(this.min, this.max, this.rawData.length);
        this.xTicks = arange(this.min, this.max, this.rawData[0].length);

        let data = [ { x: this.xTicks, y: this.yTicks, z: this.rawData, type: 'heatmap', showscale: false } ];

        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
        let update = { width: $(window).width() };
        Plotly.relayout(this.divID, update);

    }
}