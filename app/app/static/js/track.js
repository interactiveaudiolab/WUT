
const PLAY_STATUS = {
    PLAYING: "PLAYING",
    STOPPED: "STOPPED",
    PAUSED: "PAUSED"
};


class Track {

    constructor(buffer, trackID, envelopeData) {
        this._buffer = buffer;
        this._trackID = trackID;
        this._envelopeData = envelopeData;
        this._timeline = null;
        this._cursorData = { currentPosition: 0, timeStart: null };
        this._status = PLAY_STATUS.STOPPED;
        this._cursorLayer = null;

        this.isMuted = false;
        this._context = new (window.AudioContext || window.webkitAudioContext)();
        this._sourceNode = null;
        this._gainNode = null;
        this._transportPosition = 0;

        this._drawWaveform();

    }

    _drawWaveform() {

        var width = 1000; // TODO: get width of hidden div
        var height = 100;
        var pixelsPerSecond = width / this._buffer.duration;

        this._timeline = new wavesUI.core.Timeline(pixelsPerSecond, width);
        var track_ = new wavesUI.core.Track(this._trackID, height);


        /////////////////////  WAVEFORM  \\\\\\\\\\\\\\\\\\\\

        var waveformLayer = new wavesUI.core.Layer('entity', this._buffer.getChannelData(0), {
            height: height,
            yDomain: [-1.05, 1.05]
        });

        var timeContext = new wavesUI.core.LayerTimeContext(this._timeline.timeContext);
        timeContext.duration = this._buffer.duration;
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


        /////////////// 'BREAKPOINT' (aka envelope lines) \\\\\\\\\\\\\

        var breakpointLayer = new wavesUI.core.Layer('collection', this._envelopeData, {
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

        this._timeline.state = new wavesUI.states.BreakpointState(this._timeline, function (x, y) {
            // this callback allow to create a datum from values represented by the new dot
            return {x: x, y: y};
        });


        //////////////////// CURSOR \\\\\\\\\\\\\\\\\\\\

        this._cursorLayer = new wavesUI.core.Layer('entity', this._cursorData, {
            height: height
        });

        this._cursorLayer.setTimeContext(timeContext);
        this._cursorLayer.configureShape(wavesUI.shapes.Cursor, {
            x: function (d) {
                return d.currentPosition;
            }
        }, {
            color: 'black'
        });

        // Add everything to the track
        track_.add(waveformLayer);
        track_.add(this._cursorLayer);
        track_.add(breakpointLayer);
        this._timeline.add(track_);

        this._timeline.tracks.render();
        this._timeline.tracks.update();
    }

    _animateCursor() {

        if (this.isPlaying()) {
            var currentTime = new Date().getTime() / 1000;

            this._cursorData.currentPosition = currentTime % this._buffer.duration;

            if (this._cursorData.currentPosition >= this._buffer.duration) {
                this.stop();
                this._cursorData.currentPosition = 0;
                return;
            }

            this._timeline.tracks.update(this._cursorLayer);

            requestAnimationFrame($.proxy(function () {
                this._animateCursor()
            }, this));
        }
    }

    togglePlayPause() {
        if (this.isPlaying()) {
            this.pause();

        } else {
            this.play();
        }
    }

    play() {
        this._status = PLAY_STATUS.PLAYING;
        this._playAudio();
        this._animateCursor();
    }

    pause() {
        this._status = PLAY_STATUS.PAUSED;
        this._pauseAudio();
    }

    stop() {
        this._status = PLAY_STATUS.STOPPED;
        this._stopAudio();
    }

    isPlaying() {
        return this._status === PLAY_STATUS.PLAYING;
    }

    isPaused() {
        return this._status === PLAY_STATUS.PAUSED;
    }

    isStopped() {
        return this._status === PLAY_STATUS.STOPPED;
    }

    mute() {

    }

    _prepAudio() {
        this._sourceNode = this._context.createBufferSource();
        this._sourceNode.buffer = this._buffer;
        this._sourceNode.onended = this._audioEnded();

        if (!this._context.createGain)
            this._context.createGain = this._context.createGainNode;

        this._gainNode = this._context.createGain();

        // Source --> Gain Node --> Destination (output)
        this._sourceNode.connect(this._gainNode);
        this._gainNode.connect(this._context.destination);

        this._setGains();

    }

    _setGains() {
        let envelopeData = this._timeline.tracks[0].layers[2].data;

        if (envelopeData[0].x <= 0.1 ) {
            this._gainNode.gain.value = envelopeData[0].y;
        }

        var this_ = this;
        $.each(envelopeData, function(k, v) {
            this_._gainNode.gain.linearRampToValueAtTime(v.y, this_._context.currentTime + v.x);
        });
    }

    _playAudio() {
        this._prepAudio();

        this._startPlayTime = this._context.currentTime;
        if (!this._sourceNode.start) {
            this._sourceNode.noteOn(0);
        } else {
            this._sourceNode.start(0, this._transportPosition);
        }


    }

    _pauseAudio() {
        // this._sourceNode.stop();
        this._sourceNode.disconnect();

    }

    _stopAudio() {
        this._pauseAudio();

    }

    _audioEnded() {

    }
}
