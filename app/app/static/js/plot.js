function show_spectrogram_plotly(spectrogram_data) {
    var data = [
    {
        z: spectrogram_data,
        type: 'heatmap'
    }
    ];

    Plotly.newPlot('spectrogram', data);
}

function show_beat_spectrum_plotly(beat_spectrum) {
    var data = [
    {
        x: range(1, beat_spectrum.length),
        y: beat_spectrum,
        mode: 'lines'
    }
    ];
    Plotly.newPlot('beat-spectrum', data);
}

function show_spectrogram(spectrogram_data) {

    var width = 960,
    height = 500;

    d3.json(spectrogram_data, function(error, heatmap) {
        if (error) throw error;

        var dx = heatmap[0].length,
        dy = heatmap.length;

        var x = d3.scale.linear()
        .domain([0, dx])
        .range([0, width]);

        var y = d3.scale.linear()
        .domain([0, dy])
        .range([height, 0]);

        var color = d3.scale.linear()
        .domain([95, 115, 135, 155, 175, 195])
        .range(["#0a0", "#6c0", "#ee0", "#eb4", "#eb9", "#fff"]);

        var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top")
        .ticks(20);

        var yAxis = d3.svg.axis()
        .scale(y)
        .orient("right");

        d3.select("body").append("canvas")
        .attr("width", dx)
        .attr("height", dy)
        .style("width", width + "px")
        .style("height", height + "px")
        .call(drawImage);

        var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

        svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .call(removeZero);

        svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .call(removeZero);

        // Compute the pixel colors; scaled by CSS.
        function drawImage(canvas) {
            var context = canvas.node().getContext("2d"),
            image = context.createImageData(dx, dy);

            for (var y = 0, p = -1; y < dy; ++y) {
                for (var x = 0; x < dx; ++x) {
                    var c = d3.rgb(color(heatmap[y][x]));
                    image.data[++p] = c.r;
                    image.data[++p] = c.g;
                    image.data[++p] = c.b;
                    image.data[++p] = 255;
                }
            }

            context.putImageData(image, 0, 0);
        }

        function removeZero(axis) {
            axis.selectAll("g").filter(function(d) { return !d; }).remove();
        }

    });

}

function InitBeatSpectrum(beat_spectrum_data, time_data) {
    var vis = d3.select('#beat_spectrum_svg'),
                WIDTH = 1000,
                HEIGHT = 500,
                MARGINS = {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 50
                },
                lSpace = WIDTH/beat_spectrum_data.length;
                xScale = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).
                    domain([d3.min(time_data), d3.max(time_data)]),
                yScale = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).
                    domain([d3.min(beat_spectrum_data), d3.max(beat_spectrum_data)]),

                xAxis = d3.svg.axis()
                    .scale(xScale),
                    
                yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left");

    vis.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
        .call(xAxis);
    vis.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + (MARGINS.left) + ",0)")
        .call(yAxis);


    var lineGen = d3.svg.line()
        .x(time_data)
        .y(beat_spectrum_data)
        .interpolate("basis");

    vis.append('svg:path')
        .attr('d', lineGen)
        .attr('stroke', 'green')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
}

var beat_graph;

function PlotBeatSpectrum(beat_spectrum_data) {
    beat_graph = new Rickshaw.Graph( {
            element: document.getElementById('beat_spectrum_graph'),
            width: 1160,
            height: 500,
            series: [{
                color: 'steelblue',
                data: beat_spectrum_data
            }]
        });

    var time = new Rickshaw.Fixtures.Time();
    var seconds = time.unit('second');
    var xAxis = new Rickshaw.Graph.Axis.Time({
        graph: beat_graph,
        timeUnit: seconds
    });
    xAxis.render();
    var y_axis = new Rickshaw.Graph.Axis.Y( {
        graph: beat_graph,
        orientation: 'left',
        tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
        element: document.getElementById('beat_spectrum_y_axis')
    } );
    var hoverDetail = new Rickshaw.Graph.HoverDetail( {
        graph: beat_graph
    } );
    beat_graph.setRenderer('line');
    beat_graph.offset = 'zero';
    beat_graph.render();
}

function ClearBeatSpectrum() {
    if (beat_graph != null) {
        beat_graph = new Rickshaw.Graph({
            element: document.getElementById('beat_spectrum_graph'),
            width: 1160,
            height: 500,
            series: [{
                color: 'steelblue',
                data: null
            }]
        });
    }
}

function bokeh_beat_spectrum(beat_spec_array, start_time, end_time) {
    var xdr = new Bokeh.Range1d({ start: start_time, end: end_time });
    var ydr = new Bokeh.Range1d({ start: 0.0, end: beat_spec_array.max() });
    var x_vals = Bokeh.LinAlg.linspace( start_time, end_time, beat_spec_array.length);
    var beat_source = new Bokeh.ColumnDataSource({data: {x: x_vals, y: beat_spec_array}});

    var fig = plt.figure({
        width: 900,
        height: 500,
        tools: "pan,box_select",
        x_range: xdr,
        y_range: ydr,
        title: "Beat Spectrum"
        // background_fill_color: "#F2F2F7"
    });
    fig.xaxis.axis_label = "Time (s)";
    fig.yaxis.axis_label = "Beat Strength";

    var line = new Bokeh.Line({
         x: { field: "x" },
         y: { field: "y" },
         line_color: "#666699",
         line_width: 2
    });
    fig.add_glyph(line, beat_source);

    var doc = new Bokeh.Document();
    doc.add_root(fig);
    window.beat_spec_plot = fig;
    var div = document.getElementById("beat_spectrum_container_bokeh");
    Bokeh.embed.add_document_standalone(doc, div);
}

function bokeh_spectrogram(spectrogram_data, start_time, end_time, max_freq) {
    var spectrogram_source = new Bokeh.ColumnDataSource({data: {spec: [spectrogram_data]}});

    var xdr = new Bokeh.Range1d({ start: start_time, end: end_time });
    var ydr = new Bokeh.Range1d({ start: 0.0, end: max_freq });

    var fig = plt.figure({
        width: 900,
        height: 500,
        tools: "pan,box_select",
        x_range: xdr,
        y_range: ydr,
        title: "Power Spectrogram"
    });
    fig.xaxis.axis_label = "Time (s)";
    fig.yaxis.axis_label = "Freq (Hz)";

    // var cmap = Bokeh.ColorMapper({palette: "Magma10"});

    var img = new Bokeh.Image({
        image: { field: "spec"},
        x: 0,
        y: 0,
        dw: xdr.end,
        dh: ydr.end
        // color_mapper: cmap
    });
    fig.add_glyph(img, spectrogram_source);

    var doc = new Bokeh.Document();
    doc.add_root(fig);
    var div = document.getElementById("spectrogram_bokeh");
    Bokeh.embed.add_document_standalone(doc, div);
}