function _idify(id) {
    return id[0] === '#' ? id.slice(1) : id;
}


class DC1DBar {
    constructor(barID, sliderID, linkedSpecID, flipID) {
        // super(divID);
        this.barID = _idify(barID);
        this.sliderID = _idify(sliderID);
        this.linkedSpecID = _idify(linkedSpecID);
        this.linkedSpec = new ScatterSpectrogram(this.linkedSpecID);
        this.dcBarPlot = null;
        this.selectionFlipped = false;
        this.logY = false;
        this.decisionBoundary = null;
        var this_ = this;
        this.slider = $('#' + this.sliderID).slider({
            formatter: function(value) {
                return 'Current value: ' + value;
            }
        }).on('slideStop', function () {
            // TODO: replace this anon function with the real function below
            // problems with `this` keyword
            if (this_._rawData) {
                // Add markers to linked spectrogram
                this_._drawMarkers('white');
            }

        }).on('slide', function () {
            // Updates the colors on the histogram
            if (this_._rawData) {
                this_.decisionBoundary = this_.slider.getValue();

                // Update colors on histogram
                let traces = this_._makeTraces(this_.decisionBoundary);
                this_.dcBarPlot = Plotly.newPlot(this_.barID, traces, this_.plotLayout,
                    this_.plotOptions);
            }
        }).data('slider'); //.on('slideEnabled', sliderDrag);

        $('#' + flipID).click(this.flipEmbedding);

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
                autorange: true
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

    sliderDrag() {
        if (this._rawData) {
            var idx = this.slider.getValue();
            let traces = this._makeTraces(idx);

            this.dcBarPlot = Plotly.newPlot(this.barID, traces, this.plotLayout, this.plotOptions);
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

    // could maybe be link generic plot
    // would require more thinking about how generic plots
    // might interact
    addLinkedSpectrogram(linkedSpec) {
        this.linkedSpec = linkedSpec;

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            if(!data || !data.range) {
                this.linkedSpec.clearMarkers()
            } else { this._drawMarkers(data.range) }
        });
    }

    clearSelections() {
        this.resetSelections();
        this.linkedSpec.clearMarkers();
    }

    _drawMarkers(color) {
        this.linkedSpec.clearMarkers();
        let y_indices = range(0, this.decisionBoundary);
        let inner_dim = this.linkedSpec.dims[0];

        let new_markers_x = [];
        let new_markers_y = [];

        for(let y of y_indices) {
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
        $('#' + flipID).remove('disabled');
    }

    flipEmbedding() {
        this.selectionFlipped = !this.selectionFlipped;
        this.TFIndices = this.TFIndices.reverse();
        this._rawData = this._rawData.reverse();
    }

    static getCoordinateFromTFIndex(index, inner_dim) {
        return [Math.floor(index / inner_dim), index % inner_dim]
    }

    // range format - { x: [min, max], y: [min, max] }
    makeSelection(range, color) {
        let sel = new BoxSelection(undefined, undefined, range);
        this.selections.push(sel);
        this.updatePlotWithSelection();

        this._drawMarkers(range, color)
    }

    static makeRange(x_min, y_min, x_max, y_max) {
        return { x: [x_min, x_max], y: [y_min, y_max] };
    }

    static getSelectionIndices(range) {
        let x_edges = [Math.round(range.x[0]), Math.round(range.x[1])];
        let y_edges = [Math.round(range.y[0]), Math.round(range.y[1])];

        let x_indices = arange(x_edges[0], x_edges[1] + 1, (x_edges[1] - x_edges[0]) + 1);
        let y_indices = arange(y_edges[0], y_edges[1] + 1, (y_edges[1] - y_edges[0]) + 1);
        return [x_indices, y_indices];
    }

    drawBar(rawData) {
        this.enableTools();
        this._rawData = sumAlongAxis(rawData, 1);
        let traces = this._makeTraces(this.slider.getValue());

        this.dcBarPlot = Plotly.newPlot(this.barID, traces, this.plotLayout, this.plotOptions);
    }

    _calculateAxes(numXBins, numYBins) {
        let xRange = [this.plotLayout.xaxis.range[0], numXBins !== undefined ? numXBins : 1];
        let yRange = [this.plotLayout.yaxis.range[0], numYBins !== undefined ? numYBins : 1];

        let xTicks = arange(0, numXBins);
        let yTicks = arange(0, numYBins);

        return [xTicks, yTicks, xRange, yRange];
    }
}
