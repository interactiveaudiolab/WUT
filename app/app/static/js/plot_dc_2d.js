function make_pca(heatmap, rawData, numXBins, numYBins) {
    heatmap.drawHeatmap(rawData, numXBins, numYBins);
}

class DCHeatmap2D extends PlotlyHeatmap {
    constructor(divID) {
        super(divID);

        let newLayout = {
            xaxis: {
                title: 'Principal Component 0'
            },
            yaxis: {
                title: 'Principal Component 1'
            },
            showlegend: false,
        };

        // merges super and child layouts
        // overlapping fields clobbered by child
        _.merge(this.plotLayout, newLayout);

        this.emptyHeatmap()
    }

    // value in having this? makes it explicit?
    addTFIndices(indices) { this.TFIndices = indices; }

    // could maybe be link generic plot
    // would require more thinking about how generic plots
    // might interact
    addLinkedSpectrogram(linkedSpec) {
        this.linkedSpec = linkedSpec;

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            if(!data || !data.range) {
                this.linkedSpec.clearMarkers();
            } else {
                this.drawMarkers(data.range);
            }
        });
    }

    clearSelections() {
        this.resetSelections();
        this.linkedSpec.clearMarkers();
    }

    drawMarkers(range, color) {
        // parent draws box on this plot
        // need to draw scatter plot markers on spectrogram
        let [x_indices, y_indices] = DCHeatmap2D.getSelectionIndices(range);

        let inner_dim = this.linkedSpec.dims[0];

        let new_markers_x = [];
        let new_markers_y = [];

        for(let x of x_indices) {
            for(let y of y_indices) {
                if(0 <= x && x < this.TFIndices.length
                    && 0 <= y && y < this.TFIndices[0].length) {
                    // Come back to this
                    // Don't know why, but need to swap x and y here
                    let tf_indices = this.TFIndices[y][x];

                    for(let index of tf_indices) {
                        let [spec_x, spec_y] = DCHeatmap2D.getCoordinateFromTFIndex(index, inner_dim);
                        new_markers_x.push(spec_x);
                        new_markers_y.push(spec_y);
                    }
                }
            }
        }

        this.linkedSpec.addMarkers(new_markers_x, new_markers_y, color);
    }

    static getCoordinateFromTFIndex(index, inner_dim) {
        return [Math.floor(index / inner_dim), index % inner_dim]
    }

    // range format - { x: [min, max], y: [min, max] }
    makeSelection(range, color) {
        let sel = new BoxSelection(undefined, undefined, range);
        this.selections.push(sel);
        this.updatePlotWithSelection();

        this.drawMarkers(range, color)
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

    drawHeatmap(rawData, numXBins, numYBins) {
        let [xTicks, yTicks, xRange, yRange] = this._calculateAxes(numXBins, numYBins);
        this.plotLayout.xaxis.range = xRange;
        this.plotLayout.yaxis.range = yRange;

        let plotData = [{ x: xTicks, y: yTicks, z: rawData, type: 'heatmap', showscale: false}];

        this.plot = Plotly.newPlot(this.divID, plotData, this.plotLayout, this.plotOptions);
    }

    _calculateAxes(numXBins, numYBins) {
        let xRange = [this.plotLayout.xaxis.range[0], numXBins !== undefined ? numXBins : 1];
        let yRange = [this.plotLayout.yaxis.range[0], numYBins !== undefined ? numYBins : 1];

        let xTicks = arange(0, numXBins);
        let yTicks = arange(0, numYBins);

        return [xTicks, yTicks, xRange, yRange];
    }
}
