class PlotlyHeatmap {
    constructor(divID, isNotSelectable) {
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
            dragmode: isNotSelectable ? undefined : 'select',
            selectable: !isNotSelectable,
            shapes: [],
        };

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            if (data && data.range) {
                // click and drag event
                this.selections.push(new BoxSelection(data.range));
                this.updatePlotWithSelection();
            } else {
                // just a click event
                this.resetSelections();
            }
        });
    }

    get DOMObject() { return $(`#${this.divID}`) }

    get rawData() { return this._rawData; }

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

        let sel = this.selections.slice(-1)[0];
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
