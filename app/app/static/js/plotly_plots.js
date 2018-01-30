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
            shapes: new Array(),
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

        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
        let update = { width: $(window).width() };
        Plotly.relayout(this.divID, update);
    }

    updatePlotWithSelection() {
        let sel = getLastItemInArray(this.selections);
        let rect = {
            'type': 'rect',
            'x0': sel.xStart,
            'y0': sel.yStart,
            'x1': sel.xEnd,
            'y1': sel.yEnd,
            'line': {
                'color': 'rgba(245, 245, 245, 1)',
                'width': 2,
            },
            'fillcolor': 'rgba(255, 255, 255, 0.5)',
        };
        if (!this.plotLayout.hasOwnProperty('shapes')) {
            this.plotLayout.shapes = [];
        }
        this.plotLayout.shapes.push(rect);
        Plotly.relayout(this.divID, this.plotLayout);
    }

    resetSelections() {
        this.selections = [];
        this.plotLayout.shapes = [];

        Plotly.restyle(this.divID, this.plotLayout);

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

let undoSelections = [];
let redoSelections = [];


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
            enableTools(true, '.result-controls');
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