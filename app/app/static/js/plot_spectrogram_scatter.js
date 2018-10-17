function getMelScatterSpectrogramAsImage(heatmap, xaxisRange, freqMax, duration) {
    let url = "./mel_spec_image?val=" + Math.random().toString(36).substring(7);
    heatmap.drawImage(url, xaxisRange, freqMax, duration);
}

class ScatterSpectrogram extends PlotlyHeatmap {
    constructor(divID) {
        super(divID);
        let newLayout = {
            xaxis: { title: "Time (s)" },
            yaxis: { title: "Frequency (Mel)" },
            showlegend: false
        };

        // merges super and child layouts
        // overlapping fields clobbered by child
        _.merge(this.plotLayout, newLayout);

        // maybe somehow deal with duplicate markers?
        // for now just add them on top
        this.markers = [];

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            // Override this so the user doesn't accidentally lose their work
            // if(!data || !data.range) { this.clearMarkers(); }
        });

        this.emptyHeatmap();
    }

    clearMarkers() {
        this.markers = [];
        this.plot = Plotly.newPlot(this.divID, [], this.plotLayout, this.plotOptions);
    }

    addMarkers(x_marks, y_marks, color) {
        let coords = x_marks.map((x, i) => [x, y_marks[i]]);
        this.markers = this.markers.concat(coords);

        let data = {
            x: x_marks,
            y: y_marks,
            type: 'scattergl',
            mode:'markers',
            marker: {
                size: 2,
                color: color !== undefined ? color : '#ffffff',
                opacity: 1
            }
        };

        Plotly.addTraces(this.divID, data);
    }

    // returns TF mel matrix with 1s in all TF bins
    // currently selected
    exportSelectionMask() {
        let matrix = [...new Array(this.dims[1])].map(() => [... new Array(this.dims[0])].map(() => 0));
        this.markers.forEach(([x, y]) => { matrix[x][y] = 1 });
        return matrix;
    }

    setLoading(aboutToLoad) {
        if(aboutToLoad) {
            // do nothing for now
        } else {
            $('#apply-dc-selections').removeClass('disabled');

            $('.shared-plots-spinner').show();
            $('#plots-spinner').hide();
            relayoutPlots();
        }
    }

    drawImage(url, numTimeBins, durationInSecs, maxFreq) {
        let [locs, text] = generateTicks(numTimeBins, durationInSecs);

        let newLayout = {
            xaxis: {
                range: [0.0, numTimeBins],
                tickmode: 'array',
                tickvals: locs,
                ticktext: text
            },
            yaxis: {
                range: [0.0, maxFreq],
                autorange: false
            },
            images: [{
                "source": url,
                "xref": "x",
                "yref": "y",
                "x": 0,
                "y": 0,
                "sizex": numTimeBins,
                "sizey": maxFreq,
                "xanchor": "left",
                "yanchor": "bottom",
                "sizing": "stretch",
                "layer": "below"
            }]
        };

        _.merge(this.plotLayout, newLayout);

        this.plot = Plotly.newPlot(this.divID, [], this.plotLayout, this.plotOptions)
            .then(() => this.setLoading(false));
    }
}
