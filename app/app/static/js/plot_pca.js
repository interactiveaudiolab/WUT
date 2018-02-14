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
      // paper_bgcolor: '#E3F0FB',
      // plot_bgcolor: '#E3F0FB',
      margin: this.plotMargins,
      autosize: true,
    }

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
    // Plotly.relayout(this.divID, { width: $('pca').width() });
  }
}