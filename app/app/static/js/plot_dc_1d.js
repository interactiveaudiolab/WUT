class DC1DBar {
    constructor(barID, sliderID, linkedSpecID, controlsIDs) {
        this.barID = removeSelector(barID);
        this.divID = this.barID;
        this.sliderID = removeSelector(sliderID);
        this.linkedSpecID = removeSelector(linkedSpecID);
        this.linkedSpec = new ScatterSpectrogram(this.linkedSpecID, true);
        this.dcBarPlot = null;
        this.selectionFlipped = false;
        this.logY = false;
        this.decisionBoundary = null;

        // bind the slider
        this.slider = $(makeSelector(this.sliderID))
            .slider({formatter: (value) => `Current value: ${value}`})
            .on('slide', () => this.updateBarGraph())
            .on('slideStop', () => this.updateSpec())
            .data('slider');

        // bind the controls
        this.controlsIDs = controlsIDs;
        $(makeSelector(this.controlsIDs.flipID))
            .click(() => this.flipEmbedding());
        $(makeSelector(this.controlsIDs.logYCheck))
            .click(() => this.toggleLogY());
        $(makeSelector(this.controlsIDs.applyID))
            .click(() => this.processResults());

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
                title: '# of time-frequency points in spectrogram'
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

        this.dcBarPlot = Plotly.newPlot(
            this.barID,
            [this.unselectedTrace],
            this.plotLayout,
            this.plotOptions,
        );

    }

    /**
     * Partition bar graph into selected and unselected, generating traces
     * visualizing this partition
     *
     * @param {number} decisionBoundary - point along axis at which to partition
     * @retuns [[Object, Object]} tuple of trace objects to plot
     */
    _makeTraces(decisionBoundary) {
        // partition the data into 'selected' and 'unselected'
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

    /**
     * Updates selected and unselected partitions based on new slider values
     *
     * Recolors graph to display this new selection
     */
    updateBarGraph() {
        if (this._rawData) {
            this.decisionBoundary = this.slider.getValue();
            this.dcBarPlot = Plotly.react(
                this.barID,
                this._makeTraces(this.decisionBoundary),
                this.plotLayout,
                this.plotOptions,
            );
        }
    }

    updateSpec() {
        $('#apply-selections').removeClass('disabled');

        if (this._rawData) {
            this._drawMarkers('blue'); // add markers to linked spectrogram
        }
    }

    /**
     * Add embedding indices, converting from nxn matrix of binned embeddings to
     * bar histogram
     *
     * Connverts given embedding indices matrix to an n length array
     * (number[][]). This array corresponds to the greatest PCA dimension where
     * each index holds an array of all TF indices belonging to each bin along
     * the second PCA axis at that first axis point.
     *
     * @param {number[][][]} indices - nxn matrix where each coordinate
     *     holds an array of spectrogram TF indices corresponding to that bin
     */
    addTFIndices(indices) {
        this.TFIndices = indices.map(_.flatten);
    }

    processResults() {
        if(!$(addPoundToId(this.controlsIDs.applyID)).hasClass('disabled')) {
            selectionCounter++;
            socket.emit('mask', {
                mask: this.linkedSpec.exportSelectionMask()
            });
        }
    }

    _drawMarkers(color) {
        this.linkedSpec.clearMarkers();

        const newMarkersX = [];
        const newMarkersY = [];

        for (let indices of _.take(this.TFIndices, this.decisionBoundary)) {
            for (let index of indices) {
                let [specX, specY] = DC1DBar.getCoordinateFromTFIndex(
                    index,
                    this.linkedSpec.dims[0],
                );

                newMarkersX.push(specX);
                newMarkersY.push(specY);
            }
        }

        // TODO: keep marker coordinates together, then unzip when passing here?
        this.linkedSpec.addMarkers(newMarkersX, newMarkersY, color);
    }

    enableTools() {
        $(makeSelector(this.controlsIDs.className, '.'))
            .removeClass('disabled');
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
        return [Math.floor(index / inner_dim), index % inner_dim];
    }

    /**
     * Initializes bar by massaging & plotting data, and enabling interactive
     * tools
     *
     * @param {number[][][]} indices - nxn matrix where each coordinate
     *     holds an array of spectrogram TF indices corresponding to that bin
     */
    initBar(indices) {
        this.addTFIndices(indices);
        this._rawData = this.TFIndices.map(inds => inds.length);

        this.updateBarGraph();

        this.enableTools();
    }
}
