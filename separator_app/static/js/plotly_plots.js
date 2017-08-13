function make_spectrogram(divID, url, filename, audioLength, selectedRange) {
    // var logY = document.getElementById('yLogCheckbox').checked;
    // if (typeof(logY) === 'undefined') logY = false;
    var logY = false;
    var freqMax = 20000;

    baseConfigCSV.complete = function(results) {
        if (results) {
            mixture_spectrogram.rawData = parseSpecCsv(results.data);
            console.log('got csv file!!!');
            drawSpectrogramPlotly(divID, mixture_spectrogram.rawData, filename,
                freqMax, audioLength, selectedRange, logY);
        }
    };

    console.log('getting URL: ' + url);
    Papa.parse(url, baseConfigCSV);

    // drawSpectrogramPlotly(divID, results, filename, freqMax, audioLength, selectedRange, logY);


    // Plotly.d3.csv(url).header('freqMax').get(function(err, rows) {
    //
    //     drawSpectrogramPlotly(divID, rows, filename, freqMax, audioLength, selectedRange, logY);
    // });
}

function drawSpectrogramPlotly(divID, spectrogramData, filename, freqMax, audioLength, selectedRange, logY) {

    var yTicks = arange(0.0, freqMax, spectrogramData.length);
    var xTicks = arange(0.0, audioLength, spectrogramData[0].length);

    mixture_spectrogram.xTicks = xTicks;
    mixture_spectrogram.yTicks = yTicks;

    var data = [ { x: xTicks, y: yTicks, z: spectrogramData, type: 'heatmap'}];

    var layout = {
        title: "Spectrogram of " + filename,
        xaxis : {title: "Time (s)",
            // autorange: true,
            type: "linear",
            range: selectedRange,
            rangeslider: selectedRange
        },
        yaxis : {title: "Frequency (Hz)",
            type: logY ? "log" : "linear",
            autorange: true
            // ticks: yTicks
        },
        dragmode: 'select',
        selectable: true,
        paper_bgcolor: "rbga(0, 0, 0, 0)",
        plot_bgcolo: "rgba(0, 0, 0, 0)"

    };

    var options = {
        scrollZoom: false,
        showLink: false,
        modeBarButtonsToRemove: ['sendDataToCloud', 'toImage',
            'hoverClosestCartesian', 'hoverCompareCartesian',
             'toggleSpikelines'],
        // modeBarButtonsToAdd: ['lasso2d', 'select2d'],
        displaylogo: false,
        displayModeBar: true
    };

    mixture_spectrogram.plot = Plotly.newPlot(divID, data, layout, options);
}

// function parseSpecCsv(rows, numTimeSteps) {
//
//     // Parse .CSV file
//     var full_array = [];
//     for (i = 0; i < rows.length; i++) {
//         var arr = [];
//         for (j = 0; j < numTimeSteps; j++) {
//             var idx = "t" + j.toString();
//             var int_idx = parseInt(rows[i][idx]);
//             // if (isNaN(int_idx))
//             // {
//             //     console.log("NaN at: " + i.toString() + ", " + j.toString())
//             // }
//
//             arr.push(int_idx);
//         }
//         full_array.push(arr)
//     }
//
//     return full_array;
// }

var boxSelection = {
    xStart: null,
    xStartIdx: null,
    xEnd: null,
    xEndIdx: null,
    yStart: null,
    yStartIdx: null,
    yEnd: null,
    yEndIdx: null,
    timeConvertedToIndices: false,
    isEmpty: true
};

boxSelection.isValid = function() {
    return this.xStart !== null && this.xEnd !== null && this.yStart !== null && this.yEnd !== null;
};

boxSelection.convertTimesToIndices = function () {
    this.xStartIdx = findClosestIndexInSortedArray(mixture_spectrogram.xTicks, this.xStart);
    this.xEndIdx = findClosestIndexInSortedArray(mixture_spectrogram.xTicks, this.xEnd);
    this.yStartIdx = findClosestIndexInSortedArray(mixture_spectrogram.yTicks, this.yStart);
    this.yEndIdx = findClosestIndexInSortedArray(mixture_spectrogram.yTicks, this.yEnd);
    this.timeConvertedToIndices = true;
};

$('#spectrogram-heatmap').on('plotly_selected', function(eventData) {
    var range = eventData.handleObj.handler.arguments[1].range;
    // console.log(range);
    boxSelection.xStart = range.x[0];
    boxSelection.xEnd = range.x[1];
    boxSelection.yStart = range.y[0];
    boxSelection.yEnd = range.y[1];
    boxSelection.isEmpty = false;

    updateSelectionStatus(boxSelection);
    boxSelection.convertTimesToIndices();
    updatePlotWithSelection('spectrogram-heatmap', -50);

});

function updateSelectionStatus(selection) {
    var message = 'Selected Range: ' + truncateFloat(selection.xStart) + ' - ' + truncateFloat(selection.xEnd);
    message += ' sec, ' + truncateFloat(selection.yStart) + ' - ' + truncateFloat(selection.yEnd) + ' Hz';
    $('#spectrogram-selection-status').text(message);
}

function updatePlotWithSelection(divID, val) {
    if (!boxSelection.isEmpty && boxSelection.timeConvertedToIndices) {
        var selection = $.extend(true, [], mixture_spectrogram.rawData); // deep copy

        for (var y = 0; y < selection.length; y++) { // Y
            for (var x = 0; x < selection[0].length; x++) { // X
                if ((y >= boxSelection.yStartIdx && y <= boxSelection.yEndIdx)
                    && (x >= boxSelection.xStartIdx && x <= boxSelection.xEndIdx)) {
                    selection[y][x] += val;
                }
            }
        }

        // var data = [ { x: mixture_spectrogram.xTicks, y: mixture_spectrogram.yTicks,
        //     z: selection, type: 'heatmap'} ];

        Plotly.restyle(divID, {z: [selection]});
    }
}

function makeUrlFromSelection(baseUrl, selection) {
    baseUrl += '?xStart=' + truncateFloat(selection.xStart);
    baseUrl += '&xEnd=' + truncateFloat(selection.xEnd);
    baseUrl += '&yStart=' + truncateFloat(selection.yStart);
    baseUrl += '&yEnd=' + truncateFloat(selection.yEnd);

    return baseUrl;
}

$('#remove-all-but-selection').click(function () {
    if (!boxSelection.isEmpty && boxSelection.timeConvertedToIndices) {
        var url = makeUrlFromSelection('/remove_all_but_selection', boxSelection);
        result_waveform.load(url);

        // $.get(url, function (data) {
        //
        // });
    }
});

$('#result-play').click(function() {
    result_waveform.playPause();
    if (!result_waveform.isPlaying()) {
        // Audio is paused
        $('#result-play').removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause')
            .attr('title', 'Pause audio');
    } else {
        // Audio is playing
        $('#result-play').removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
    }
});