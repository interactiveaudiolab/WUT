// import * as Plotly from "./vendor/plotly.js-master/src/core";


class PlotlyHeatmap {

    constructor(divID, yMax) {
        var _this = this;
        this.divID = divID;
        this.DOMObject = $('#' + this.divID);

        this.plot = null;
        this._rawData = null;
        this.selections = [];
        this.selectionData = null;

        this.selected_val = 25;

        this.DOMObject.on('plotly_selected', function(eventData) {

            if (arguments.length > 1 && arguments[1].hasOwnProperty("range")) {
                // click and drag event
                let range = arguments[1].range;

                let curSelection = new BoxSelection(_this.xTicks, _this.yTicks, range);
                _this.selections.push(curSelection);

                updateSelectionStatus(_this.selections.length);
                _this.updatePlotWithSelection();
            }
            else {
                // just a click event
                _this.resetSelections();
            }

        });

        this.plotMargins = {   // TODO: put these values into Jinja variables
            l: 95, // left
            r: 95, // right
            b: 50, // bottom
            t: 10, // top
            pad: 4
        };

        this.plotOptions = {
            scrollZoom: false,
            showLink: false,
            displaylogo: false,
            displayModeBar: false
        };

        this.xMax = 1.0;
        this.xTicks = null;
        this.yTicks = null;

        if (yMax === undefined) {
            this.yMax = 1.0;
        }
        else {
            this.yMax = yMax;
        }
        this.logY = false;

        this.plotLayout = {
            xaxis: {
                // title: "Time (s)",
                type: "linear",
                range: [0.0, this.xMax],
            },
            yaxis: {
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
            // height: 500,
            margin: this.plotMargins,
            autosize: true,
        };

        this.colorBarOptions = {
            len: 0.81,
            tickvals: [0, 1],
            ticks: "inside",
            showticklabels: false
        };
    }

    get rawData() {
        return this._rawData;
    }

    set rawData(data) {
        this._rawData = data;
        this.selectionData = Array.apply(null, new Array(data.length)).map(Array.prototype.valueOf, []);
        for (let i=0; i < data.length; i++) {
            this.selectionData[i] = Array.apply(null, new Array(data[0].length)).map(Boolean.prototype.valueOf, false);
        }
    }

    emptyHeatmap() {

        let data = [ { x: [0.0, this.xMax], y: [0.0, this.yMax], z: [[0.0, 0.0], [0.0, 0.0]],
            type: 'heatmap', showscale: false }];

        this.plotLayout.yaxis.autorange = false;
        // this.plotLayout.yaxis.type = "log";

        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
        let update = { width: $(window).width() };
        Plotly.relayout(this.divID, update);
    }

    updatePlotWithSelection() {
        if (this.selections.length > 0) {
            for (let sel of this.selections) {
                for (let y = sel.yStartIdx; y < sel.yEndIdx; y++) {
                    for (let x = sel.xStartIdx; x < sel.xEndIdx; x++) {
                        this.selectionData[y][x] = true;
                    }
                }
            }
            let dataWithSelections = $.extend(true, [], this.rawData); // deep copy

            // TODO: Figure out generator syntax
            // for (let sel in selections) {
            //     let s = sel.valuesInSelection();
            //     while (!s.done) {
            //         dataWithSelections[i.y][i.x] -= val;
            //         s = s.next();
            //     }
            // }

            for (let y = 0; y < dataWithSelections.length; y++) {
                for (let x = 0; x < dataWithSelections[0].length; x++) {
                    if (this.selectionData[y][x]) {
                        dataWithSelections[y][x] += this.selected_val;
                    }
                }
            }

            Plotly.restyle(this.divID, {z: [dataWithSelections]});
        }
    }

    resetSelections() {
        this.selections = [];

        for (let i=0; i < this.selectionData.length; i++) {
            for (let j=0; j < this.selectionData[i].length; j++) {
                this.selectionData[i][j] = false;
            }
        }

        Plotly.restyle(this.divID, {z: [this.rawData]});

        $('#general-status').text('Ready...')
    }

    drawHeatmap() {

    }

}

$( window ).resize(function() {
    let update = { width: $(window).width() };
    Plotly.relayout("spectrogram-heatmap", update);
    Plotly.relayout("result-spectrogram-heatmap", update);
    Plotly.relayout("ft2d-heatmap", update);
});

// let selections = [];

let undoSelections = [];
let redoSelections = [];

// $('#spectrogram-heatmap').on('plotly_selected', function(eventData) {
//     let handlerArgs = eventData.handleObj.handler.arguments;
//
//     if (handlerArgs.length > 1 && handlerArgs[1].hasOwnProperty("range")) {
//         // click and drag event
//         let range = handlerArgs[1].range;
//
//         let curSelection = new BoxSelection(mixture_spectrogram.xTicks, mixture_spectrogram.yTicks, range);
//         selections.push(curSelection);
//
//         updateSelectionStatus(curSelection);
//         updatePlotWithSelection('spectrogram-heatmap', 50);
//     }
//     else {
//         // just a click event
//         resetSelections('spectrogram-heatmap');
//     }
//
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

function updateSelectionStatus(num_selections) {
    $('#general-status').text(num_selections + ' selections');
}

$('#mixture-spec-delete-unselected').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }
    postActionAndProcess('RemoveAllButSelections', mixture_spectrogram_heatmap.divID,
        mixture_spectrogram_heatmap.selections);

});

$('#mixture-spec-delete-selected').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }

    postActionAndProcess('RemoveSelections', mixture_spectrogram_heatmap.divID,
        mixture_spectrogram_heatmap.selections);
});

$('#ft2d-delete-unselected').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }
    postActionAndProcess('RemoveAllButSelections', ft2d_heatmap.divID, ft2d_heatmap.selections);

});

$('#ft2d-delete-selected').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }

    postActionAndProcess('RemoveSelections', ft2d_heatmap.divID, ft2d_heatmap.selections);
});

$('#duet-delete-unselected').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }
    postActionAndProcess('RemoveAllButSelections', duet_histogram.divID, duet_histogram.selections);

});

$('#duet-delete-selected').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }

    postActionAndProcess('RemoveSelections', duet_histogram.divID, duet_histogram.selections);
});

function postActionAndProcess(actionType, target, selections) {
    if (selections.length > 0) {

        let selectionData = [];
        for (let sel of selections) {
            selectionData.push(sel.data());
        }

        let actionData = {
            actionType: actionType,
            target: target,
            data: { selectionData: selectionData }
        };

        let postUrl = '/action?val=' + Math.random().toString(36).substring(7);

        $.ajax({
            type: "POST",
            url: postUrl,
            contentType: 'application/json',
            dataType: 'json',
            cache: false,
            data: JSON.stringify({actionData: actionData}),
            success: function () {}
        }).then(function(result) {
            let url = '/process?val='+ Math.random().toString(36).substring(7);
            result_waveform.load(url);
            enableResultControls(true);
        }).then(function() {
            let res = $('#results-pill');
            if (!res.hasClass('active')) {
                res.addClass('result-ready');
            }
            var url = "/get_spectrogram?get_result=1&val=" + Math.random().toString(36).substring(7);
            make_spectrogram(result_spectrogram_heatmap, url, mixture_waveform.backend.getDuration())
        });
    }
}