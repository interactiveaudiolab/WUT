let pcaSelectionModal = new Modal('pca-selection-modal', 'modal-active',
'pca-selection-modal-active', 'modal-cover', 'modal-ready',
'pca-selection-modal-open', 'pca-selection-modal-close')

let setupPlotly = (_this, plotId) => {
  _this.layout = {
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

  let plot = Plotly.newPlot(plotId, data, _this.layout, plotOptions);

  gd.on('plotly_click', (data) => {
    let pointIndex = data.points[0].pointIndex;
    let index = _this.layout.shapes.findIndex(shape => shape.x0 + .5 === pointIndex);

    if(index !== -1) {
      _this.layout.shapes.splice(index, 1);
    } else {
      if(_this.layout.shapes.length > 1) _this.layout.shapes.shift();

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
      _this.layout.shapes.push(shape);
    }

    Plotly.relayout(gd, _this.layout);

    let cl = document.getElementById('pca-selection-modal-begin').classList
    cl.remove('disabled') ? _this.layout.shape.length > 1 : cl.add('disabled');
  });
}

// executes passed in function with `_this` as
// the calling object (pcaSelectionModal)
pcaSelectionModal._addArbitraryFunction(setupPlotly, ['pca-dimensions']);
