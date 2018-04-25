let pcaSelectionModal = new Modal('modal-active', 'pca-selection-modal-active', 'modal-cover',
'modal-ready', 'pca-selection-modal-open', 'pca-selection-modal-close')

let setupPlotly = (plotId) => {
  this.layout = {
    shapes: []
  };

  // PLOTLY
  var data = [{
    x: ['Eignenvector 1', 'Eignenvector 2', 'Eignenvector 3'],
    y: [20, 14, 23],
    type: 'bar'
  }];

  let gd = document.getElementById(plotId);

  let plotOptions = {
    scrollZoom: false,
    showLink: false,
    displaylogo: false,
    displayModeBar: false
  };
  let plot = Plotly.newPlot(plotId, data, undefined, plotOptions);

  gd.on('plotly_click', (data) => {
    let pointIndex = data.points[0].pointIndex;
    let index = this.layout.shapes.findIndex(shape => shape.x0 + .5 === pointIndex);

    if(index !== -1) {
      this.layout.shapes.splice(index, 1);
    } else {
      if(this.layout.shapes.length > 1) this.layout.shapes.shift();

      let shape = {
        type: 'rect',
        xref: 'x',
        x0: pointIndex - .5,
        x1: pointIndex + .5,
        yref: 'paper',
        y0: 0,
        y1: 1,
        opacity: 1
      }
      this.layout.shapes.push(shape);
    }

    Plotly.relayout(gd, this.layout);

    let cl = document.getElementById('modal-begin').classList
    cl.remove('disabled') ? this.layout.shape.length > 1 : cl.add('disabled');
  });
}

// executes passed in function with `this` as
// the calling object (pcaSelectionModal)
pcaSelectionModal._addArbitraryFunction(setupPlotly, ['pca-dimensions']);