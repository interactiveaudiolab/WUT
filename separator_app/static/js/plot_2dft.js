
// import PlotlyHeatmap from "plotly_plots.js";

function make_2dft(url) {
    // var logY = document.getElementById('yLogCheckbox').checked;


    console.log('getting URL: ' + url);

    Plotly.d3.csv(url, function(err, rows) {
        console.log('got csv 2DFT file!!!');
        let status = $('#general-status');
        status.text('Drawing 2DFT...');

        ft2d_heatmap.rawData = d3ParseCsv(rows);
        ft2d_heatmap.drawHeatmap();
        status.text('Ready...');
        enableTools(true, '.ft2d-tool');
    });
}


class FT2DHeatmap extends PlotlyHeatmap {

    constructor(divID, yMax) {
        super(divID, yMax);

        this.plotLayout = {

            // Data
            xaxis : {
                // title: "Time (s)",
                autorange: true,
                type: "linear",
            },
            yaxis : {
                // title: "Frequency (Hz)",
                type: "linear",
                autorange: true,
                range: [0.0, this.yMax]
            },

            // Interaction
            dragmode: 'select',
            selectable: true,

            // Cosmetics
            paper_bgcolor: '#E3F0FB', // 'rgb(0,0,0,0); doesn't work :(
            plot_bgcolor: '#E3F0FB',
            // width: 500,
            // height: 575,
            margin: this.plotMargins,
            autosize: true,

        };

        this.emptyHeatmap();

    }

    drawHeatmap() {
        this.xTicks = arange(0.0, this.rawData[0].length, this.rawData[0].length);
        this.yTicks = arange(0.0, this.rawData.length, this.rawData.length);

        let data = [ { z: this.rawData, type: 'heatmap', showscale: false, colorscale: 'Electric' } ];

        // delete this.plotLayout.yaxis.range;
        this.plotLayout.yaxis.range = [0.0, this.rawData.length];
        this.plotLayout.xaxis.range = [0.0, this.rawData[0].length];

        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
        let update = { width: $(window).width() };
        Plotly.relayout(this.divID, update);
    }
}

$( window ).resize(function() {
    let update = { width: $(window).width() };
    Plotly.relayout("ft2d-heatmap", update);
});