
var timeline;

function drawWaveform(buffer, $track, data) {

    var width = 1000; // TODO: get width of hidden div
    var height = 100;
    var pixelsPerSecond = width / buffer.duration;

    var timeline = new wavesUI.core.Timeline(pixelsPerSecond, width);
    var track = new wavesUI.core.Track($track, height);

    // WAVEFORM
    var waveformLayer = new wavesUI.core.Layer('entity', buffer.getChannelData(0), {
        height: height,
        yDomain: [-1.05, 1.05]
    });

    var timeContext = new wavesUI.core.LayerTimeContext(timeline.timeContext);
    timeContext.duration = buffer.duration;
    timeContext.start = 0.0;

    waveformLayer.setTimeContext(timeContext);
    waveformLayer.configureShape(wavesUI.shapes.Waveform, {
        y: function(d) { return d; },
    }, {
        color: 'steelblue'
    });
    // as the waveform is an `entity` layer, we have to edit the context directly
    waveformLayer.setContextEditable(true);

    // timeline.state = new wavesUI.states.ContextEditionState(timeline);

    // 'BREAKPOINT' (aka automation lines)
    var breakpointLayer = new wavesUI.core.Layer('collection', data, {
        height: height
    });

    var accessors = {
        cx: function(d, v) {
            if (v !== undefined) { d.x = v; }
            return d.x;
        },
        cy: function(d, v) {
            if (v !== undefined) { d.y = v; }
            return d.y;
        },
        color: function(d) {
            return 'red'
        }
    };

    breakpointLayer.setTimeContext(timeContext);
    breakpointLayer.configureCommonShape(wavesUI.shapes.Line, accessors, { color: 'red' });
    breakpointLayer.configureShape(wavesUI.shapes.Dot, accessors);
    breakpointLayer.setBehavior(new wavesUI.behaviors.BreakpointBehavior());

    timeline.state = new wavesUI.states.BreakpointState(timeline, function(x, y) {
        // this callback allow to create a datum from values represented by the new dot
        return { x: x, y: y };
    });


    // CURSOR
    var cursorData = { currentPosition: 0 };

    var cursorLayer = new wavesUI.core.Layer('entity', cursorData, {
        height: height
    });

    cursorLayer.setTimeContext(timeContext);
    cursorLayer.configureShape(wavesUI.shapes.Cursor, {
        x: function(d) { return d.currentPosition; }
    }, {
        color: 'black'
    });


    track.add(waveformLayer);
    track.add(cursorLayer);
    track.add(breakpointLayer);
    timeline.add(track);

    timeline.tracks.render();
    timeline.tracks.update();

    (function loop() {
        if ($('#req-play').find('i').hasClass('glyphicon-pause')) {
            var currentTime = new Date().getTime() / 1000;
            cursorData.currentPosition = currentTime % buffer.duration;
            timeline.tracks.update(cursorLayer);

            requestAnimationFrame(loop);
        }

    }());
}