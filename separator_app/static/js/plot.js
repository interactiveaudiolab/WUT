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