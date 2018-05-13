let pcaSelectionModal = new Modal('pca-selection-modal', 'modal-active',
'pca-selection-modal-active', 'modal-cover', 'modal-ready',
'pca-selection-modal-open', 'pca-selection-modal-close')

$('#pca-selection-modal-open').click(() =>
Plotly.relayout('pca-dimensions', { width: $('#pca-selection-modal-plot-wrapper').width() }));

let setupPlotly = (_this, plotId, explained_variance) => {
  let data = [{
    x: arange(0, explained_variance.length, explained_variance.length).map(
      x => x.toString()),
    y: explained_variance,
    type: 'bar'
  }];

  _this.layout = {
    shapes: [{
      type: 'rect',
      xref: 'x',
      x0:  -.5,
      x1: .5,
      yref: 'paper',
      y0: 0,
      y1: 1,
      opacity: 1
    },
    {
      type: 'rect',
      xref: 'x',
      x0:  .5,
      x1: 1.5,
      yref: 'paper',
      y0: 0,
      y1: 1,
      opacity: 1
    }],
    xaxis: {
      fixedrange: true,
      title: "Eigenvectors"
    },
    yaxis: {
      fixedrange: true,
      title: "Fraction of Explained Variance"
    }
  };

  let plotOptions = {
    scrollZoom: false,
    showLink: false,
    displaylogo: false,
    displayModeBar: false
  };

  let gd = document.getElementById(plotId);
  let plot = Plotly.newPlot(plotId, data, _this.layout, plotOptions);

  gd.on('plotly_click', (click_event) => {
    let pointIndex = click_event.points[0].pointIndex;
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
        // TODO: make this a little taller than the value at this spot
        y1: 1,
        opacity: 1
      }
      _this.layout.shapes.push(shape);
    }

    Plotly.relayout(gd, _this.layout);

    // plotly removes shapes array if empty on relayout
    if(_this.layout.shapes === undefined) {
      _this.layout.shapes = [];
    }

    let cl = document.getElementById('pca-selection-modal-begin').classList
    _this.layout.shapes.length > 1 ? cl.remove('disabled') : cl.add('disabled');
  });
}
