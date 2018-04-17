class PlotlyHeatmap {
    constructor(divID) {
        this.divID = divID[0] === '#' ? divID.slice(1) : divID;

        this.plot = null;
        this._rawData = null;
        this.selections = [];
        this.selectionData = null;

        this.plotOptions = {
            scrollZoom: false,
            showLink: false,
            displaylogo: false,
            displayModeBar: false
        };

        this.logY = false;

        this.plotLayout = {
            xaxis: {
                type: "linear",
                range: [0.0, 1.0],
                showgrid: false,
                fixedrange: true
            },
            yaxis: {
                type: "linear",
                range: [0.0, 1.0],
                showgrid: false,
                fixedrange: true,
                autorange: true
            },
            margin: {
                l: 50,
                r: 10,
                b: 50,
                t: 10
            },

            autosize: true,

            // Interaction
            hovermode: false,
            dragmode: 'select',
            selectable: true,
            shapes: [],
        };

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            if (data && data.range) {
                // click and drag event
                this.selections.push(new BoxSelection(data.range));
                this.updatePlotWithSelection();
            }
            // just a click event
            else { this.resetSelections(); }
        });
    }

    get DOMObject() { return $(`#${this.divID}`) }

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
        this.plotLayout.yaxis.autorange = false;
        this.plot = Plotly.newPlot(this.divID, [], this.plotLayout, this.plotOptions);
        // Plotly.relayout(this.divID, { width: this.DOMObject.width() });
    }

    static getColor() {
        let colorVal = $('#spec-color').find('.active').children().prop('id');
        return colorDict[colorVal];
    }

    updatePlotWithSelection() {
        if (!this.plotLayout.hasOwnProperty('shapes')) {
            this.plotLayout.shapes = [];
        }
        // let colors = PlotlyHeatmap.getColor();
        let colors = colorDict.white;

        let sel = getLastItemInArray(this.selections);
        let rect = {
            'type': 'rect',
            'x0': sel.xStart,
            'y0': sel.yStart,
            'x1': sel.xEnd,
            'y1': sel.yEnd,
            'line': {
                'color': colors.line,
                'width': 1,
            },
            'fillcolor': colors.fill,
        };

        this.plotLayout.shapes.push(rect);
        Plotly.relayout(this.divID, this.plotLayout);
    }

    resetSelections() {
        this.selections = [];
        this.plotLayout.shapes = [];

        Plotly.restyle(this.divID, this.plotLayout);
    }

    drawHeatmap() {} // implement in inherited classes
}

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
    resetSelections('spectrogram');
});

$('#mixture-spec-delete-unselected').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }
    postActionAndProcess('RemoveAllButSelections', mixture_spectrogram_heatmap.divID,
        mixture_spectrogram_heatmap.selections);
});

$('#selection-remove').click(function () {
    if( $(this).hasClass("disabled") ) {
        return;
    }

    postActionAndProcess('RemoveSelections', mixture_spectrogram_heatmap.target,
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