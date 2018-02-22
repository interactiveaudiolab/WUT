function make_pca(heatmap, rawData) {
  let status = $('#status');
  status.text('Drawing PCA');

  heatmap.drawHeatmap(rawData)
  // enableTools(true, '.spec-tool')

  status.text('Ready...');
}



class PCAHeatmap extends PlotlyHeatmap {
  constructor(divID, yMax) {
    super(divID, yMax);

    // currently hardcoding in x and y range
    // might be better dynamic
    this.xBins = 100
    this.yBins = 100

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

    this.DOMObject.on('plotly_selected', (eventData, data) => {
      console.log('In PCA selection')

      if(data) {
          // parent on draws box on this plot
          // just need to draw boxes on spectrogram
          console.log(spectrogram)
          console.log(spec_dims)
          range = data.range
          let x_edges = [Math.round(range.x[0]), Math.round(range.x[1])]
          let y_edges = [Math.round(range.y[0]), Math.round(range.y[1])]

          console.log(x_edges)
          console.log(y_edges)

          let x_indices = arange(x_edges[0], x_edges[1] + 1, (x_edges[1] - x_edges[0]) + 1)
          let y_indices = arange(y_edges[0], y_edges[1] + 1, (y_edges[1] - y_edges[0]) + 1)

          // naive initial implementation
          // give each index its box so for example
          // a TF bin at (x, y) after unrolling
          // creates a mask with opposite corners
          // (x, y) & (x + 1, y + 1)
          console.log(`Before creating selections: ${currTime()}`)

          let y_dim = spec_dims[0]
          let x_dim = spec_dims[1]
          for(let x of x_indices) {
            for(let y of y_indices) {
              if(0 <= x && x < pca_tf_indices.length
              && 0 <= y && y < pca_tf_indices[0].length) {
                // Come back to this
                // Don't know why, but need to swap x and y here
                let tf_indices = pca_tf_indices[y][x];
                for(let index of tf_indices) {
                  // let spec_x = 15*(Math.floor(index / y_dim)/x_dim)
                  let spec_x = 15 * ((index % x_dim) / x_dim);
                  let spec_y = Math.floor(index / x_dim);

                  // REMOVE NASTY HARDCODING
                  if(TAKE_THIS_OUT_ONLY_FOR_KILLING_CODE_WHILE_TESTING) {
                    console.log(`Index: ${index}`)
                    console.log(`Spec index: ${spec_x}, ${spec_y}`)
                  }

                  let range = { x: [spec_x, spec_x + 1/x_dim], y: [spec_y, spec_y + 1] };
                  let currSelection = new BoxSelection(undefined, undefined, range);
                  spectrogram.selections.push(currSelection);
                }
              }
            }
          }

          console.log(`After creating selections: ${currTime()}`)
          if(spectrogram.selections.length > 0) {
            spectrogram.updatePlotWithSelection(true);
          }
          console.log(`After applying selections: ${currTime()}`)
      }
    });

    this.emptyHeatmap()
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