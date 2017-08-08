function make_spectrogram(divID, url, filename, audioLength, selectedRange) {
    // var logY = document.getElementById('yLogCheckbox').checked;
    // if (typeof(logY) === 'undefined') logY = false;
    var logY = false;

    Plotly.d3.csv(url, function(err, rows) {

        var numTimeSteps = objectLength(rows[0]) - 1;


        // Parse .CSV file
        var full_array = [];
        for (i = 0; i < rows.length; i++) {
            var arr = [];
            for (j = 0; j < numTimeSteps; j++) {
                var idx = "t" + j.toString();
                var int_idx = parseInt(rows[i][idx]);
                // if (isNaN(int_idx))
                // {
                //     console.log("NaN at: " + i.toString() + ", " + j.toString())
                // }

                arr.push(int_idx);
            }
            full_array.push(arr)
        }

        var yTicks = [];
        var freqStep = 20000 / rows.length;
        for (i = 0; i < rows.length; i++) {
            yTicks.push(freqStep * i);
        }

        var xTicks = [];
        var timeStep = audioLength / numTimeSteps;
        for (i = 0; i < numTimeSteps; i++) {
            xTicks.push(timeStep * i);
        }

        var data = [ { x: xTicks, y: yTicks, z: full_array, type: 'heatmap'}];

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
            selectable: true

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

        mixture_spectrogram = Plotly.newPlot(divID, data, layout, options);

    });
}

var boxSelection = {xStart: null, xEnd: null, yStart: null, yEnd: null};
boxSelection.isValid = function() {
    return this.xStart != null && this.xEnd != null && this.yStart != null && this.yEnd != null;
}

$('#spectrogram-heatmap').on('plotly_selected', function(eventData) {
    var range = eventData.handleObj.handler.arguments[1].range;
    console.log(range);
    boxSelection.xStart = range.x[0];
    boxSelection.xEnd = range.x[1];
    boxSelection.yStart = range.y[0];
    boxSelection.yEnd = range.y[1];

    updateSelectionStatus(boxSelection);
});

function updateSelectionStatus(selection) {
    var message = 'Selected Range: ' + truncateFloat(selection.xStart) + ' - ' + truncateFloat(selection.xEnd);
    message += ' sec, ' + truncateFloat(selection.yStart) + ' - ' + truncateFloat(selection.yEnd) + ' Hz';
    $('#spectrogram-selection-status').text(message);
}