function make_pca(heatmap, rawData) {
  let status = $('#status');
  status.text('Drawing PCA');

  heatmap.drawHeatmap(rawData)

  status.text('Ready...');
}



class PCAHeatmap extends PlotlyHeatmap {
  constructor(divID, yMax) {
    super(divID, yMax);

    // might be better dynamic
    this.xBins = yMax;
    this.yBins = yMax;

    this.plotMargins = {
      l: 50,
      r: 10,
      b: 50,
      t: 10
    };

    this.plotLayout = {
      xaxis: {
        title: 'Principal Component 1',
        type: 'linear',
        range: [0, this.xBins]
      },
      yaxis: {
        title: 'Principal Component 2',
        type: 'linear',
        range: [0, this.yBins]
      },

      // selectability
      dragmode: 'select',
      selectable: 'true',

      // cosmetics
      margin: this.plotMargins,
      autosize: true,
    }

    this.drawMarkers = (range, color) => {
      // parent draws box on this plot
      // need to draw scatter plot markers on spectrogram
      // console.log(`Beginning selections: ${currTime()}`)

      let [x_indices, y_indices] = this.getSelectionIndices(range);

      let inner_dim = spec_dims[0];

      let new_markers_x = [];
      let new_markers_y = [];

      for(let x of x_indices) {
        for(let y of y_indices) {
          if(0 <= x && x < pca_tf_indices.length
          && 0 <= y && y < pca_tf_indices[0].length) {
            // Come back to this
            // Don't know why, but need to swap x and y here
            let tf_indices = pca_tf_indices[y][x];

            for(let index of tf_indices) {
              let [spec_x, spec_y] = this.getCoordinateFromTFIndex(index, inner_dim);
              new_markers_x.push(spec_x);
              new_markers_y.push(spec_y);
            }
          }
        }
      }

      spectrogram.addMarkers(new_markers_x, new_markers_y, color);
    }

    this.DOMObject.on('plotly_selected', (eventData, data) => {
      if(!data || !data.range) {
        spectrogram.clearMarkers()
      } else { this.drawMarkers(data.range) }
    });

    this.emptyHeatmap()
  }

  getCoordinateFromTFIndex(index, inner_dim) {
    return [Math.floor(index / inner_dim), index % inner_dim]
  }

  // range format - { x: [min, max], y: [min, max] }
  makeSelection(range, color) {
    let sel = new BoxSelection(undefined, undefined, range);
    this.selections.push(sel)
    this.updatePlotWithSelection()

    this.drawMarkers(range, color)
  }

  makeRange(x_min, y_min, x_max, y_max) {
    return { x: [x_min, x_max], y: [y_min, y_max] };
  }

  getSelectionIndices(range) {
    let x_edges = [Math.round(range.x[0]), Math.round(range.x[1])]
    let y_edges = [Math.round(range.y[0]), Math.round(range.y[1])]

    let x_indices = arange(x_edges[0], x_edges[1] + 1, (x_edges[1] - x_edges[0]) + 1)
    let y_indices = arange(y_edges[0], y_edges[1] + 1, (y_edges[1] - y_edges[0]) + 1)
    return [x_indices, y_indices];
  }

  drawHeatmap(rawData) {
    this.rawData = rawData;

    this.xTicks = arange(0, this.xBins);
    this.yTicks = arange(0, this.yBins);
    let data = [{ x: this.xTicks, y: this.yTicks,
      z: this.rawData, type: 'heatmap', showscale: false}];
    let layout = this.plotLayout;

    this.plot = Plotly.newPlot(this.divID, data, layout, this.plotOptions);
  }
}