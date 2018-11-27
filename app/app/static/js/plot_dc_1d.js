function _idify(id) {
    return id[0] === '#' ? id.slice(1) : id;
}


class DC1DBar {
    constructor(barID, sliderID, linkedSpecID, controlsIDs) {
        this.barID = _idify(barID);
        this.divID = this.barID;
        this.sliderID = _idify(sliderID);
        this.linkedSpecID = _idify(linkedSpecID);
        this.linkedSpec = new ScatterSpectrogram(this.linkedSpecID, true);
        this.dcBarPlot = null;
        this.selectionFlipped = false;
        this.logY = false;
        this.decisionBoundary = null;

        // Bind the slider
        this.slider = $('#' + this.sliderID).slider({
            formatter: function(value) {
                return 'Current value: ' + value;
            }
        }).on('slideStop',
            $.proxy(this.updateSpec, this)
        ).on('slide',
            $.proxy(this.updateBarGraph, this)
        ).data('slider');

        // Bind the controls
        this.controlsIDs = controlsIDs;
        $('#' + this.controlsIDs.flipID).click($.proxy(this.flipEmbedding, this));
        $('#' + this.controlsIDs.logYCheck).click($.proxy(this.toggleLogY, this));
        $('#' + this.controlsIDs.applyID).click($.proxy(this.processResults, this));

        this._rawData = null;

        this.plotOptions = {
            scrollZoom: false,
            showLink: false,
            displaylogo: false,
            displayModeBar: false
        };

        this.unselectedTrace = {
            y: null,
            x: null,
            type: 'bar',
            marker: {
                color: 'blue',
                opacity: 0.8
            }
        };

        this.selectedTrace = {
            y: null,
            x: null,
            type: 'bar',
            marker: {
                color: 'orange',
                opacity: 0.8
            }
        };


        this.plotLayout = {
            xaxis: {
                type: "linear",
                range: [0.0, 100.0],
                showgrid: false,
                fixedrange: true
            },
            yaxis: {
                type: "linear",
                range: [0.0, 1.0],
                showgrid: true,
                fixedrange: true,
                autorange: true,
                title: 'Selected'
            },
            yaxis2: {
                ticks: '',
                showticklabels: false,
                title: 'Unselected'

            },
            margin: {
                l: 50,
                r: 10,
                b: 50,
                t: 10
            },

            autosize: true,
            bargap: 0.0,
            showlegend: false,

            // Interaction
            hovermode: false,
            selectable: false,
        };

        this.emptyBars();
    }

    get DOMObject() { return $(`#${this.divID}`) }

    emptyBars() {
        let n = 100;
        this.unselectedTrace.x = arange(0, n, 1);
        this.unselectedTrace.y = zeros(n, 1);

        this.dcBarPlot = Plotly.newPlot(this.barID, [this.unselectedTrace],
            this.plotLayout, this.plotOptions);

    }

    _makeTraces(decisionBoundary) {
        // Partition the data into 'selected' and 'unselected'
        var selectedIdx = arange(0, this._rawData.length, this._rawData.length);
        var unselectedIdx = selectedIdx.splice(0, decisionBoundary);
        var selectedVals = JSON.parse(JSON.stringify(this._rawData));
        var unselectedVals = selectedVals.splice(0, decisionBoundary);

        this.unselectedTrace.x = unselectedIdx;
        this.unselectedTrace.y = unselectedVals;
        this.selectedTrace.x = selectedIdx;
        this.selectedTrace.y = selectedVals;

        return [this.unselectedTrace, this.selectedTrace];
    }

    updateBarGraph() {
        if (this._rawData) {
            this.decisionBoundary = this.slider.getValue();
            let traces = this._makeTraces(this.decisionBoundary);

            // Update colors on histogram
            this.dcBarPlot = Plotly.newPlot(this.barID, traces, this.plotLayout, this.plotOptions);
        }
    }

    updateSpec() {
        $('#apply-selections').removeClass('disabled');

        if (this._rawData) {
            // Add markers to linked spectrogram
            this._drawMarkers('white');
        }
    }

    addTFIndices(indices) {
        indices = transpose(indices);
        let result = [];
        for (let i = 0; i < indices.length; i++) {
            let idxs = [];
            for (let j = 0; j < indices[0].length; j++) {
                for (let k = 0; k < indices[i][j].length; k ++) {
                    idxs.push(indices[i][j][k]);
                }
            }
            result.push(idxs);
        }
        this.TFIndices = result;
    }

    processResults() {
        if(!$('#' + this.controlsIDs.applyID).hasClass('disabled')) {
            selectionCounter++;
            socket.emit('mask', { mask: this.linkedSpec.exportSelectionMask() });
        }
    }

    _drawMarkers(color) {
        this.linkedSpec.clearMarkers();
        let y_indices = range(0, this.decisionBoundary);
        let inner_dim = this.linkedSpec.dims[0];

        let new_markers_x = [];
        let new_markers_y = [];

        for(let y of y_indices) {
            if (y >= this.TFIndices.length) {
                continue;
            }

            let tf_indices = this.TFIndices[y];
            for(let index of tf_indices) {
                let [spec_x, spec_y] = DC1DBar.getCoordinateFromTFIndex(index, inner_dim);
                new_markers_x.push(spec_x);
                new_markers_y.push(spec_y);
            }
        }

        this.linkedSpec.addMarkers(new_markers_x, new_markers_y, color);
    }

    enableTools() {
        $('.' + this.controlsIDs.className).removeClass('disabled');
    }

    flipEmbedding() {
        this.selectionFlipped = !this.selectionFlipped;
        this.TFIndices = this.TFIndices.reverse();
        this._rawData = this._rawData.reverse();
        this.updateBarGraph();
        this.updateSpec();
    }

    toggleLogY() {
        this.logY = !this.logY;
        this.plotLayout.yaxis.type = this.logY ? 'log' : 'linear';
        this.updateBarGraph();
    }

    static getCoordinateFromTFIndex(index, inner_dim) {
        return [Math.floor(index / inner_dim), index % inner_dim]
    }

    initBar(rawData) {
        this._rawData = sumAlongAxis(rawData, 1);
        let traces = this._makeTraces(this.slider.getValue());

        this.dcBarPlot = Plotly.newPlot(this.barID, traces, this.plotLayout, this.plotOptions);
        this.enableTools();
    }
}
