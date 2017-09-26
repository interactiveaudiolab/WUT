// import * as Plotly from "./vendor/plotly.js-master/src/core";

function make_spectrogram(divID, url, audioLength, selectedRange) {
    // var logY = document.getElementById('yLogCheckbox').checked;
    // if (typeof(logY) === 'undefined') logY = false;
    let logY = true;
    let freqMax = 20000;

    baseConfigCSV.complete = function(results) {
        if (results) {
            mixture_spectrogram.rawData = papaParseSpecCsv(results.data);
            console.log('got csv file!!!');
            $('#general-status').text('Drawing Spectrogram...');
            drawSpectrogramPlotly(divID, mixture_spectrogram.rawData,
                freqMax, audioLength, selectedRange, logY);
            enableSpecTools(true);
        }
    };

    console.log('getting URL: ' + url);
    // Papa.parse(url, baseConfigCSV);

    // drawSpectrogramPlotly(divID, results, filename, freqMax, audioLength, selectedRange, logY);


    Plotly.d3.csv(url, function(err, rows) {
        console.log('got csv file!!!');
        $('#general-status').text('Drawing Spectrogram...');

        mixture_spectrogram.rawData = d3ParseCsv(rows);
        mixture_spectrogram.selectedArray = Array.apply(null, new Array(rows.length)).map(Array.prototype.valueOf, []);
        for (let i=0; i < rows.length; i++) {
            mixture_spectrogram.selectedArray[i] = Array.apply(null, new Array(rows[0].length)).map(Boolean.prototype.valueOf, false);
        }

        drawSpectrogramPlotly(divID, mixture_spectrogram.rawData, freqMax, audioLength, selectedRange, logY);
        enableSpecTools(true);
    });
}

let spectrogramMargins = { l: 75 , r: 75, b: 50, t: 10, pad: 4 };  // TODO: Jinja variable
let spectrogramOptions = {
    scrollZoom: false,
    showLink: false,
    // modeBarButtonsToRemove: ['sendDataToCloud', 'toImage',
    //     'hoverClosestCartesian', 'hoverCompareCartesian',
    //     'toggleSpikelines'],
    // modeBarButtonsToAdd: ['lasso2d', 'select2d'],
    displaylogo: false,
    displayModeBar: false
};

let spectrogramLayout = {
    // title: "Spectrogram of " + filename,

    // Data
    xaxis : {title: "Time (s)",
        // autorange: true,
        type: "linear",
        range: [0.0, 1.0],
        // rangeslider: [0.0, 1.0]
    },
    yaxis : {title: "Frequency (Hz)",
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
    margin: spectrogramMargins,
    autosize: true,

};

let colorBarOptions = {
    len: 0.81,
    tickvals: [0, 1],
    ticks: "inside",
    showticklabels: false
};

function drawSpectrogramPlotly(divID, spectrogramData, freqMax, audioLength, selectedRange, logY) {

    let yTicks = arange(0.0, freqMax, spectrogramData.length);
    let xTicks = arange(0.0, audioLength, spectrogramData[0].length);

    mixture_spectrogram.xTicks = xTicks;
    mixture_spectrogram.yTicks = yTicks;
    // let colorbarOpts = colorBarOptions;
    // colorbarOpts.tickvals = [0, 20, 40, 60, 80];

    let data = [ { x: xTicks, y: yTicks, z: spectrogramData,
        type: 'heatmap', showscale: false, /*colorbar: colorbarOpts*/ }];

    let layout = spectrogramLayout;
    layout.xaxis.range = selectedRange;
    // layout.xaxis.rangeslider = selectedRange;
    layout.yaxis.type = logY ? "log" : "linear";
    layout.yaxis.autorange = logY;
    layout.yaxis.range = [0.0, freqMax / 2];

    mixture_spectrogram.plot = Plotly.newPlot(divID, data, layout, spectrogramOptions);
    $('#general-status').text('Ready...');
}

function emptyHeatmap(divID) {

    let data = [ { x: [0.0, 1.0], y: [0.0, 20000.0], z: [[0.0, 0.0], [0.0, 0.0]],
        type: 'heatmap', showscale: false /*colorbar: colorBarOptions*/ }];

    mixture_spectrogram.plot = Plotly.newPlot(divID, data, spectrogramLayout, spectrogramOptions);

}

$( window ).resize(function() {
    let update = { width: $(window).width() };
    Plotly.relayout("spectrogram-heatmap", update);
});

let selections = [];

let undoSelections = [];
let redoSelections = [];

$('#spectrogram-heatmap').on('plotly_selected', function(eventData) {
    let handlerArgs = eventData.handleObj.handler.arguments;

    if (handlerArgs.length > 1 && handlerArgs[1].hasOwnProperty("range")) {
        // click and drag event
        let range = handlerArgs[1].range;

        let curSelection = new BoxSelection(mixture_spectrogram.xTicks, mixture_spectrogram.yTicks, range);
        selections.push(curSelection);

        updateSelectionStatus(curSelection);
        updatePlotWithSelection('spectrogram-heatmap', 50);
    }
    else {
        // just a click event
        resetSelections('spectrogram-heatmap');
    }

});

// $('#spectrogram-heatmap').on('plotly_click', function(eventData) {
//     resetSelections('spectrogram-heatmap');
// });

$('#undo').click(function() {
    if( $(this).hasClass("disabled") ) {
        return;
    }

    undoSelections.push(selections.shift());
});

$('#clear-selection').click(function() {
    if( $(this).hasClass("disabled") ) {
        return;
    }
    resetSelections('spectrogram-heatmap');

});

function resetSelections(divID) {
    selections = [];

    for (let i=0; i < mixture_spectrogram.selectedArray.length; i++) {
        for (let j=0; j < mixture_spectrogram.selectedArray[i].length; j++) {
            mixture_spectrogram.selectedArray[i][j] = false;
        }
    }

    Plotly.restyle(divID, {z: [mixture_spectrogram.rawData]});

    $('#general-status').text('Ready...')
}

function updateSelectionStatus(selection) {
    let message = '';

    if (selections.length === 1) {
        message = 'Selected Range: ' + truncateFloat(selection.xStart) + ' - ' + truncateFloat(selection.xEnd);
        message += ' sec, ' + truncateFloat(selection.yStart) + ' - ' + truncateFloat(selection.yEnd) + ' Hz';
    }
    else {
        message = selections.length + ' selections';
    }

    $('#general-status').text(message);
}

function updatePlotWithSelection(divID, val) {
    if (selections.length > 0) {
        for (let sel of selections) {
            for (let y = sel.yStartIdx; y < sel.yEndIdx; y++) {
                for (let x = sel.xStartIdx; x < sel.xEndIdx; x++) {
                    mixture_spectrogram.selectedArray[y][x] = true;
                }
            }
        }
        let dataWithSelections = $.extend(true, [], mixture_spectrogram.rawData); // deep copy

        // TODO: Figure out generator syntax
        // for (let sel in selections) {
        //     let s = sel.valuesInSelection();
        //     while (!s.done) {
        //         dataWithSelections[i.y][i.x] -= val;
        //         s = s.next();
        //     }
        // }

        for (let y = sel.yStartIdx; y < sel.yEndIdx; y++) {
            for (let x = sel.xStartIdx; x < sel.xEndIdx; x++) {
                if (mixture_spectrogram.selectedArray[y][x]) {
                    dataWithSelections[y][x] += val;
                }
            }
        }

        Plotly.restyle(divID, {z: [dataWithSelections]});
    }
}

$('#remove-all-but-selection').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }

    if (selections.length > 0) {

        let selectionData = [];
        for (let sel of selections) {
            selectionData.push(sel.data());
        }

        let actionData = {
            actionType: 'RemoveAllButSelections',
            data: { selectionData: selectionData }
        };

        let postUrl = '/action';

        $.ajax({
            type: "POST",
            url: postUrl,
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({actionData: actionData}),
            success: function () {
            }
        }).then(function(result) {
            let url = '/process';
            result_waveform.load(url);
            enableResultControls(true);
        }).then(function(result) {
            if (!$('#results-pill').hasClass('active')) {
                $('#results-pill').addClass('result-ready');
            }
        });
    }
});

$('#delete-selection').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }

    if (selections.length > 0) {

        let selectionData = [];
        for (let sel of selections) {
            selectionData.push(sel.data());
        }

        let actionData = {
            actionType: 'RemoveSelections',
            data: { selectionData: selectionData }
        };

        let postUrl = '/action';

        $.ajax({
            type: "POST",
            url: postUrl,
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({actionData: actionData}),
            success: function () {

            }
        }).then(function(result) {
            let url = '/process';
            result_waveform.load(url);
            enableResultControls(true);
        }).then(function(result) {
            if (!$('#results-pill').hasClass('active')) {
                $('#results-pill').addClass('result-ready');
            }
        });
    }
});

$('#result-play').click(function() {
    if (!result_waveform.backend.buffer) {
        return;
    }

    if (!result_waveform.isPlaying()) {
        // Audio is paused
        $('#result-play').find("i").removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause')
            .attr('title', 'Pause audio');
    } else {
        // Audio is playing
        $('#result-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
    }
    result_waveform.playPause();
});