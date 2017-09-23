

function make_2dft(divID, url) {
    // var logY = document.getElementById('yLogCheckbox').checked;
    // if (typeof(logY) === 'undefined') logY = false;
    let logY = true;
    let freqMax = 20000;


    console.log('getting URL: ' + url);

    Plotly.d3.csv(url, function(err, rows) {
        console.log('got csv 2DFT file!!!');
        $('#general-status').text('Drawing 2DFT...');

        mixture_2dft.rawData = d3ParseCsv(rows);
        draw2DFTPlotly(divID, mixture_2dft.rawData);
    });
}

let ft2dMargins = { l: 75 , r: 75, b: 50, t: 10, pad: 4 };  // TODO: Jinja variable
let ft2dOptions = {
    scrollZoom: false,
    showLink: false,
    displaylogo: false,
    displayModeBar: false
};

let ft2dLayout = {
    // title: "Spectrogram of " + filename,

    // Data
    xaxis : {
        // title: "Time (s)",
        autorange: true,
        type: "linear",
        // range: [0.0, 1.0],
        // rangeslider: [0.0, 1.0]
    },
    yaxis : {
        // title: "Frequency (Hz)",
        type: "linear",
        autorange: true,
        // ticks: yTicks
        // range: [0.0, 20000.0]
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
    margin: ft2dMargins,
    autosize: true,

};


function draw2DFTPlotly(divID, ft2dData) {

    // let yTicks = arange(0.0, freqMax, spectrogramData.length);
    // let xTicks = arange(0.0, audioLength, spectrogramData[0].length);

    // mixture_spectrogram.xTicks = xTicks;
    // mixture_spectrogram.yTicks = yTicks;
    // let colorbarOpts = colorBarOptions;
    // colorbarOpts.tickvals = [0, 20, 40, 60, 80];

    let data = [ { z: ft2dData, type: 'heatmap', showscale: false}];

    let layout = ft2dLayout;

    mixture_spectrogram.plot = Plotly.newPlot(divID, data, layout, ft2dOptions);
    $('#general-status').text('Ready...');
}

$( window ).resize(function() {
    let update = { width: $(window).width() };
    Plotly.relayout("ft2d-heatmap", update);
});