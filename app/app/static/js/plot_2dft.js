function make_2dft(results) {
    console.log('Got 2DFT from server!');
    let status = $('#general-status');
    status.text('Drawing 2DFT...');

    ft2d_heatmap.rawData = results;
    ft2d_heatmap.drawHeatmap();
    status.text('Ready...');
    enableTools(true, '.ft2d-tool');
}

class FT2DHeatmap extends PlotlyHeatmap {

    constructor(divID, yMax) {
        super(divID, yMax);

        this.plotLayout = {

            // Data
            xaxis : {
                autorange: true,
                type: "linear",
            },
            yaxis : {
                type: "linear",
                autorange: true,
            },

            // Interaction
            dragmode: 'select',
            selectable: true,

            // Cosmetics
            paper_bgcolor: '#f8f8f8', // 'rgb(0,0,0,0); doesn't work :(
            plot_bgcolor: '#f8f8f8',
            margin: this.plotMargins,
            autosize: true,

        };

        this.emptyHeatmap();
    }

    drawHeatmap() {
        let data = [ { z: this.rawData, type: 'heatmap', showscale: false, colorscale: 'Electric' } ];
        this.plotLayout.yaxis.range = [0.0, this.rawData.length];
        this.plotLayout.xaxis.range = [0.0, this.rawData[0].length];

        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
        let update = { width: $(window).width() };
        Plotly.relayout(this.divID, update);
    }
}