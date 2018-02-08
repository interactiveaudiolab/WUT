

class Track {

    constructor(buffer, trackID, envelopeData) {
        this.buffer = buffer;
        this.trackID = trackID;
        this.envelopeData = envelopeData;
        this.timeline = null;
        this.cursorData = { currentPosition: 0, timeStart: null };
        this.playing = false;
        this.cursorLayer = null;

        this.isMuted = false;
    }

    drawWaveform() {

        var width = 1000; // TODO: get width of hidden div
        var height = 100;
        var pixelsPerSecond = width / this.buffer.duration;

        this.timeline = new wavesUI.core.Timeline(pixelsPerSecond, width);
        var track_ = new wavesUI.core.Track(this.trackID, height);

        // WAVEFORM
        var waveformLayer = new wavesUI.core.Layer('entity', this.buffer.getChannelData(0), {
            height: height,
            yDomain: [-1.05, 1.05]
        });

        var timeContext = new wavesUI.core.LayerTimeContext(this.timeline.timeContext);
        timeContext.duration = this.buffer.duration;
        timeContext.start = 0.0;

        waveformLayer.setTimeContext(timeContext);
        waveformLayer.configureShape(wavesUI.shapes.Waveform, {
            y: function (d) {
                return d;
            },
        }, {
            color: 'steelblue'
        });
        // as the waveform is an `entity` layer, we have to edit the context directly
        waveformLayer.setContextEditable(true);

        // timeline.state = new wavesUI.states.ContextEditionState(timeline);

        // 'BREAKPOINT' (aka automation lines)
        var breakpointLayer = new wavesUI.core.Layer('collection', this.envelopeData, {
            height: height
        });

        var accessors = {
            cx: function (d, v) {
                if (v !== undefined) {
                    d.x = v;
                }
                return d.x;
            },
            cy: function (d, v) {
                if (v !== undefined) {
                    d.y = v;
                }
                return d.y;
            },
            color: function (d) {
                return 'red'
            }
        };

        breakpointLayer.setTimeContext(timeContext);
        breakpointLayer.configureCommonShape(wavesUI.shapes.Line, accessors, {color: 'red'});
        breakpointLayer.configureShape(wavesUI.shapes.Dot, accessors);
        breakpointLayer.setBehavior(new wavesUI.behaviors.BreakpointBehavior());

        this.timeline.state = new wavesUI.states.BreakpointState(this.timeline, function (x, y) {
            // this callback allow to create a datum from values represented by the new dot
            return {x: x, y: y};
        });


        // CURSOR
        this.cursorLayer = new wavesUI.core.Layer('entity', this.cursorData, {
            height: height
        });

        this.cursorLayer.setTimeContext(timeContext);
        this.cursorLayer.configureShape(wavesUI.shapes.Cursor, {
            x: function (d) {
                return d.currentPosition;
            }
        }, {
            color: 'black'
        });

        // Add everything to the track
        track_.add(waveformLayer);
        track_.add(this.cursorLayer);
        track_.add(breakpointLayer);
        this.timeline.add(track_);

        this.timeline.tracks.render();
        this.timeline.tracks.update();
    }

    progressCursor() {

        if (this.playing) {
            var currentTime = new Date().getTime() / 1000;
            // var inc = ;

            this.cursorData.currentPosition = currentTime % this.buffer.duration;

            if (this.cursorData.currentPosition >= this.buffer.duration) {
                this.stop();
                this.cursorData.currentPosition = 0;
                return;
            }

            this.timeline.tracks.update(this.cursorLayer);

            requestAnimationFrame($.proxy(function () {
                this.progressCursor()
            }, this));
        }
    }

    togglePlayPause() {
        this.playing = !this.playing;
        if (this.playing) {

            this.progressCursor()

        } else {

        }
    }

    stop() {
        this.playing = false;
    }

    prepAudio() {
        var source = window.AudioContext.createBufferSource();
        source.buffer = this.buffer;

        var gainNode = window.AudioContext.createGain();

        // Source --> Gain Node --> Destination (output)
        source.connect(gainNode);
        gainNode.connect(window.AudioContext.destination);

    }

    playAudio() {

    }

    stopAudio() {

    }
}
