// import * as Plotly from "./vendor/plotly.js-master/src/core";

function make_spectrogram(divID, url, filename, audioLength, selectedRange) {
    // var logY = document.getElementById('yLogCheckbox').checked;
    // if (typeof(logY) === 'undefined') logY = false;
    let logY = false;
    let freqMax = 20000;

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

    let yTicks = arange(0.0, freqMax, spectrogramData.length);
    let xTicks = arange(0.0, audioLength, spectrogramData[0].length);

    mixture_spectrogram.xTicks = xTicks;
    mixture_spectrogram.yTicks = yTicks;

    let data = [ { x: xTicks, y: yTicks, z: spectrogramData, type: 'heatmap'}];

    let layout = {
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

    let options = {
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



// var boxSelection = {
//     xStart: null,
//     xStartIdx: null,
//     xEnd: null,
//     xEndIdx: null,
//     yStart: null,
//     yStartIdx: null,
//     yEnd: null,
//     yEndIdx: null,
//     timeConvertedToIndices: false,
//     isEmpty: true
// };
// boxSelection.isValid = function() {
//     return this.xStart !== null && this.xEnd !== null && this.yStart !== null && this.yEnd !== null;
// };
//
// boxSelection.convertTimesToIndices = function () {
//     this.xStartIdx = findClosestIndexInSortedArray(mixture_spectrogram.xTicks, this.xStart);
//     this.xEndIdx = findClosestIndexInSortedArray(mixture_spectrogram.xTicks, this.xEnd);
//     this.yStartIdx = findClosestIndexInSortedArray(mixture_spectrogram.yTicks, this.yStart);
//     this.yEndIdx = findClosestIndexInSortedArray(mixture_spectrogram.yTicks, this.yEnd);
//     this.timeConvertedToIndices = true;
// };

let selections = [];

$('#spectrogram-heatmap').on('plotly_selected', function(eventData) {
    let range = eventData.handleObj.handler.arguments[1].range;

    let curSelection = new BoxSelection(mixture_spectrogram.xTicks, mixture_spectrogram.yTicks, range);
    selections.push(curSelection);

    updateSelectionStatus(curSelection);
    updatePlotWithSelection('spectrogram-heatmap', 50);

});

function updateSelectionStatus(selection) {
    let message = '';

    if (selections.length === 1) {
        message = 'Selected Range: ' + truncateFloat(selection.xStart) + ' - ' + truncateFloat(selection.xEnd);
        message += ' sec, ' + truncateFloat(selection.yStart) + ' - ' + truncateFloat(selection.yEnd) + ' Hz';
    }
    else {
        message = selections.length + ' selections';
    }

    $('#spectrogram-selection-status').text(message);
}

function updatePlotWithSelection(divID, val) {
    if (selections.length > 0) {
        let dataWithSelections = $.extend(true, [], mixture_spectrogram.rawData); // deep copy

        // TODO: Figure out generator syntax
        // for (let sel in selections) {
        //     let s = sel.valuesInSelection();
        //     while (!s.done) {
        //         dataWithSelections[i.y][i.x] -= val;
        //         s = s.next();
        //     }
        // }

        for (let sel of selections) {
            for (let y = sel.yStartIdx; y < sel.yEndIdx; y++) {
                for (let x = sel.xStartIdx; x < sel.xEndIdx; x++) {
                    dataWithSelections[y][x] -= val;
                }
            }
        }

        Plotly.restyle(divID, {z: [dataWithSelections]});
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
    if (selections.length > 0) {

        let selectionData = [];
        for (let sel of selections) {
            selectionData.push(sel.data());
        }

        let actionData = {
            actionType: 'RemoveAllButSelections',
            selectionData: selectionData
        };

        let postUrl = '/action';

        // $.post( postUrl, {actionData: actionData}, function () {
        //         let url = '/process';
        //         result_waveform.load(url);
        //     },
        //
        // );

        $.ajax({
            type: "POST",
            url: postUrl,
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({actionData: actionData}),
            success: function () {
                let url = '/process';
                result_waveform.load(url);
            }
        });

        // let url = makeUrlFromSelection('/remove_all_but_selection', boxSelection);
    }
});

function postSelection(selection) {
    $.post()
}

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