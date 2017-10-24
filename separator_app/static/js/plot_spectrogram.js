
// import PlotlyHeatmap from "plotly_plots.js";

function make_spectrogram(heatmap, url, audioLength) {
    // var logY = document.getElementById('yLogCheckbox').checked;
    // if (typeof(logY) === 'undefined') logY = false;
    let logY = true;
    let freqMax = 20000;

    Plotly.d3.csv(url, function(err, rows) {
        console.log('got csv file!!!');
        let status = $('#general-status');
        status.text('Drawing Spectrogram...');

        heatmap.rawData = d3ParseCsv(rows);
        heatmap.drawHeatmap(audioLength, freqMax, logY);
        enableSpecTools(true);

        status.text('Ready...');
    });
}


class SpectrogramHeatmap extends PlotlyHeatmap {

    constructor(divID, yMax) {
        super(divID, yMax);
        this.audioLength = null;
        this.freqMax = null;

        this.plotLayout = {

            // Data
            xaxis: {
                title: "Time (s)",
                // autorange: true,
                type: "linear",
                range: [0.0, 1.0],
                // rangeslider: [0.0, 1.0]
            },
            yaxis: {
                title: "Frequency (Hz)",
                type: "linear",
                autorange: true,
                // ticks: yTicks
                range: [0.0, 20000.0]
            },
            // type: 'heatmap',

            // Interaction
            dragmode: 'select',
            selectable: true,

            // Cosmetics
            paper_bgcolor: '#E3F0FB', // 'rgb(0,0,0,0); doesn't work :(
            plot_bgcolor: '#E3F0FB',
            // width: 500,
            // height: 500,
            margin: this.plotMargins,
            autosize: true,

        };

        this.emptyHeatmap();
    }

    drawHeatmap(audioLength, freqMax, logY) {
        this.audioLength = audioLength;
        this.freqMax = freqMax;
        this.logY = logY;

        this.yTicks = arange(0.0, this.freqMax, this.rawData.length);
        this.xTicks = arange(0.0, this.audioLength, this.rawData[0].length);

        // let colorbarOpts = colorBarOptions;
        // colorbarOpts.tickvals = [0, 20, 40, 60, 80];

        let data = [ { x: this.xTicks, y: this.yTicks, z: this.rawData, type: 'heatmap', showscale: false } ];

        let layout = this.plotLayout;
        layout.xaxis.range = [0.0, this.audioLength];
        // layout.xaxis.rangeslider = selectedRange;
        layout.yaxis.type = this.logY ? "log" : "linear";
        layout.yaxis.autorange = this.logY;
        layout.yaxis.range = [0.0, this.freqMax / 2];

        this.plot = Plotly.newPlot(this.divID, data, layout, this.plotOptions);
        let update = { width: $(window).width() };
        Plotly.relayout(this.divID, update);

    }
}