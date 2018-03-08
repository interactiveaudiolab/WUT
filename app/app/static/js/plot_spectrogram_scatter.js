function getMelScatterSpectrogramAsImage(heatmap, xaxisRange, freqMax, duration) {
    let url = "./mel_spec_image?val=" + Math.random().toString(36).substring(7);
    heatmap.drawImage(url, xaxisRange, freqMax, duration);
}

class ScatterSpectrogram extends PlotlyHeatmap {
    constructor(divID, yMax) {
        console.log(`Scatter spec this: ${this}`)
        // currently hardcoding
        // use yMax argument later
        super(divID, 150);
        this.audioLength = null;
        this.freqMax = null;

        let newLayout = {
            xaxis: {
                title: "Time (s)",
                fixedrange: true
            },
            yaxis: {
                title: "Frequency (Mel)",
                fixedrange: true
            },
            margin: {
                l: 50,
                r: 10,
                b: 50,
                t: 10
            },
            showlegend: false,
            hovermode: false
        };

        this.plotLayout = { ...this.plotLayout, ...newLayout }

        // maybe somehow deal with duplicate markers?
        // for now just add them on top
        this.markers = []

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            if(!data || !data.range) { this.clearMarkers(); }
        });

        this.emptyHeatmap();
    }

    clearMarkers() {
        this.markers = []
        let data = [{x:[], y:[]}];
        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions);
    }

    addMarkers(x_marks, y_marks, color) {
        let coords = x_marks.map((x, i) => [x, y_marks[i]])
        this.markers = this.markers.concat(coords)

        let data = {
            x: x_marks,
            y: y_marks,
            type: 'scattergl',
            mode:'markers',
            marker: {
                size: 2,
                color: (color !== undefined ? color : '#ffffff'),
                opacity: 1
            }
        }

        Plotly.addTraces(spectrogram.divID, data);
    }

    // returns TF mel matrix with 1s in all TF bins
    // currently selected
    exportSelectionMask() {
        let matrix = [...new Array(this.dims[1])].map(() => [... new Array(this.dims[0])].map(() => 0))
        this.markers.forEach(([x, y]) => { matrix[x][y] = 1 });
        return matrix;
    }

    setLoading(aboutToLoad) {
        if(aboutToLoad) {
            // do nothing for now
        } else {
            $('#apply-selections').removeClass('disabled');
            $('.shared-plots-spinner').show();
            $('#plots-spinner').hide();
            relayoutPlots();
        }
    }

    drawImage(url, xaxisRange, freqMax, duration) {
        let [locs, text] = generateTicks(xaxisRange, duration);

        let newLayout = {
            xaxis: {
                range: [0.0, xaxisRange],
                tickmode: 'array',
                tickvals: locs,
                ticktext: text
            },
            yaxis: {
                range: [0.0, freqMax],
                autorange: false
            },
            images: [{
                "source": url,
                "xref": "x",
                "yref": "y",
                "x": 0,
                "y": 0,
                "sizex": xaxisRange,
                "sizey": freqMax,
                "xanchor": "left",
                "yanchor": "bottom",
                "sizing": "stretch",
                "layer": "below"
            }]
        }

        this.plotLayout = { ...this.plotLayout, ...newLayout }

        let data = [{x:[], y:[]}];
        this.plot = Plotly.newPlot(this.divID, data, this.plotLayout, this.plotOptions)
            .then(() => this.setLoading(false));
    }
}