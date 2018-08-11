

class TemporalDeepClustering extends PlotlyHeatmap {

    constructor(divID, linkedSpec) {
        super(divID);

        this.linkedSpec = linkedSpec;

        let newLayout = {
            xaxis: {
                range: this.linkedSpec.plotLayout.xaxis.range
            },
            yaxis: {

            },
            showlegend: false,
        };

        // merges super and child layouts
        // overlapping fields clobbered by child
        _.merge(this.plotLayout, newLayout);

        this.emptyHeatmap()
    }
}