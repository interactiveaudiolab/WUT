const PLAY_STATUS = {
    PLAYING: "PLAYING",
    STOPPED: "STOPPED",
    PAUSED: "PAUSED"
};

class Track {
    constructor(buffer, context, trackID, envelopeData, slider, audioEndCallback, totalTracks) {
        this._buffer = buffer;
        this._trackID = trackID;
        this._waveformColor = $(this._trackID).data('color');
        this._envelopeData = envelopeData;
        this._envelopeDataHidden = false;
        this._envelopeDataColorMuted = false;
        this._recommendationData = null;

        this._timeline = null;
        this._wavesUITrack = null;
        this._timeContext = null;
        this._cursorData = { currentPosition: 0, timeStart: null };
        this._status = PLAY_STATUS.STOPPED;
        this._waveformLayer = null;
        this._cursorLayer = null;
        this._breakpointLayer = null;
        this._accessors = null;
        this._defaultEnvelopeColor = 'red';
        this._mutedEnvelopeColor = '#c1c1c1';
        this._height = 100;

        this.isMuted = false;
        this.muteSelected = false;
        this.isSoloed = false;
        this.soloSelected = false;

        this._context = context;
        this._sourceNode = null;
        this._gainNode = null;
        this._pausedPosition = 0;
        this._slider = slider;
        this._gainMax = 1 / totalTracks;

        this._startPlayTime = null;
        this.audioEndCallback = audioEndCallback;

        this._startedAt = 0;
        this._pausedAt = 0;

        this._drawWholeTrack();
    }

    _drawWholeTrack() {
        var width = $(this._trackID).actual( 'width' );
        var pixelsPerSecond = width / this._buffer.duration;

        this._timeline = new wavesUI.core.Timeline(pixelsPerSecond, width);
        this._wavesUITrack = new wavesUI.core.Track(this._trackID, this._height);

        this._makeNewWaveformLayer(this._waveformColor);
        this._makeNewBreakpointLayer(this._defaultEnvelopeColor);
        this._makeNewCursorLayer();

        // Add everything to the track
        this._addAllLayers();
        this._timeline.add(this._wavesUITrack);

        this._timeline.tracks.render();
        this._timeline.tracks.update();
    }

    _addAllLayers() {
        this._wavesUITrack.add(this._waveformLayer);
        this._wavesUITrack.add(this._cursorLayer);
        this._wavesUITrack.add(this._breakpointLayer);
    }

    _removeAllLayers() {
        this._wavesUITrack.remove(this._waveformLayer);
        this._wavesUITrack.remove(this._cursorLayer);
        this._wavesUITrack.remove(this._breakpointLayer);
    }

    _makeNewWaveformLayer(waveformColor) {
        this._waveformLayer = new wavesUI.core.Layer('entity', this._buffer.getChannelData(0), {
            height: this._height,
            yDomain: [-1.05, 1.05]
        });

        this._timeContext = new wavesUI.core.LayerTimeContext(this._timeline.timeContext);
        this._timeContext.duration = this._buffer.duration;
        this._timeContext.start = 0.0;

        this._waveformLayer.setTimeContext(this._timeContext);
        this._waveformLayer.configureShape(wavesUI.shapes.Waveform,
            { y: d => d }, { color: waveformColor });
        // as the waveform is an `entity` layer, we have to edit the context directly
        this._waveformLayer.setContextEditable(true);
    }

    _makeNewBreakpointLayer(breakpointColor) {
        if (!this._timeline) throw Error('this._timeline is null!')
        if (!this._timeContext) throw Error('this._timeContext is null!')

        this._breakpointLayer = new wavesUI.core.Layer('collection',
            this._envelopeData, { height: this._height });

        let accessors = {
            cx: function (d, v) {
                if (v !== undefined) { d.x = v; }
                return d.x;
            },
            cy: function (d, v) {
                if (v !== undefined) { d.y = v; }
                return d.y;
            },
            color: _ => breakpointColor
        };

        this._breakpointLayer.setTimeContext(this._timeContext);
        this._breakpointLayer.configureCommonShape(wavesUI.shapes.Line, accessors, {color: breakpointColor});
        this._breakpointLayer.configureShape(wavesUI.shapes.Dot, accessors);
        this._breakpointLayer.setBehavior(new wavesUI.behaviors.BreakpointBehavior());

        // this callback allow to create a datum from values represented by the new dot
        this._timeline.state = new wavesUI.states.BreakpointState(this._timeline,
            (x, y) => { return {x: x, y: y}; });
    }

    _makeNewCursorLayer() {
        this._cursorLayer = new wavesUI.core.Layer('entity', this._cursorData, {
            height: this._height,
            width: 3
        });

        this._cursorLayer.setTimeContext(this._timeContext);
        this._cursorLayer.configureShape(wavesUI.shapes.Cursor,
            { x: d => d.currentPosition }, { color: 'black' });
    }

    _animateCursor() {
        if (this.isPlaying()) {
            this.cursorPosition = this.getCurrentTime() + this._pausedAt;

            if (this.cursorPosition >= this._buffer.duration) {
                this.stop();
                return;
            }

            requestAnimationFrame($.proxy(() => this._animateCursor(), this));
        }
    }

    set cursorPosition(value) {
        if (value >= this._buffer.duration) { value = this._buffer.duration; }

        this._cursorData.currentPosition = value;
        this._timeline.tracks.update(this._cursorLayer);

        // Only set the slider if there's a new number
        // otherwise all of the tracks will set the slider redundantly
        if (this._slider.bootstrapSlider('getValue') !== value) {
            this._slider.bootstrapSlider('setValue', value);
        }
    }

    get cursorPosition() { return this._cursorData.currentPosition; }

    setEnvelopeData(data) {
        this.clearAllEnvelopeData();
        this._recommendationData = data;
        this._breakpointLayer.data = data;
        this._redrawLayer(this._breakpointLayer);
    }

    _redrawLayer(layer) {
        this._timeline.tracks.render(layer);
        this._timeline.tracks.update(layer);
    }

    addEnvelopeDataPoint(x_, y_) {
        this._breakpointLayer.data.push({x: x_, y: y_});
        this._redrawLayer(this._breakpointLayer);
    }

    clearAllEnvelopeData() {
        this._breakpointLayer.data = [];
        this._redrawLayer(this._breakpointLayer);
    }

    hideEnvelopeData() {
        this._envelopeData = this._breakpointLayer.data;
        this._breakpointLayer.data = [{x: 0.0, y: 0.8}, {x: this._buffer.duration, y: 0.8}];
        this._envelopeDataHidden = true;

        this._redrawLayer(this._breakpointLayer);
    }

    showEnvelopeData() {
        this._breakpointLayer.data = this._envelopeData;
        this._envelopeDataHidden = false;

        this._redrawLayer(this._breakpointLayer);
    }

    toggleEnvelopeData() {
        this._envelopeDataHidden ? this.showEnvelopeData() : this.hideEnvelopeData();
    }

    muteEnvelopeData() {
        this._envelopeDataColorMuted = true;
        this._changeBreakpointColor(this._mutedEnvelopeColor, 0.25);
    }

    unmuteEnvelopeData() {
        this._envelopeDataColorMuted = false;
        this._changeBreakpointColor(this._defaultEnvelopeColor, 1.0);
    }

    _changeBreakpointColor(envelopeColor, waveformOpacity) {
        this._timeline.tracks.layers[0].params.opacity = waveformOpacity;

        this._envelopeData = this._breakpointLayer.data; // save current data
        this._wavesUITrack.remove(this._breakpointLayer); // remove layer
        this._makeNewBreakpointLayer(envelopeColor); // create new layer with new color
        this._wavesUITrack.add(this._breakpointLayer); // add new layer

        // this.showEnvelopeData();
        this._breakpointLayer.data = this._envelopeData;
        this._redrawLayer(this._breakpointLayer);
        this._timeline.tracks.updateLayers();
    }

    toggleEnvelopeColor() {
        this._envelopeDataColorMuted ? this.unmuteEnvelopeData() : this.muteEnvelopeData();
    }

    changeWaveformBuffer(buffer, ch) {
        this._buffer = buffer;
        this._waveformLayer.data = buffer.getChannelData(ch);
        this._redrawLayer(this._waveformLayer);
    }

    togglePlayPause() { this.isPlaying() ? this.pause() : this.play(); }

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

    isPlaying() { return this._status === PLAY_STATUS.PLAYING; }

    isPaused() { return this._status === PLAY_STATUS.PAUSED; }

    isStopped() { return this._status === PLAY_STATUS.STOPPED; }

    mute() {
        this.isMuted = true;
        if (this._gainNode) {
            this._gainNode.gain.cancelScheduledValues(this._context.currentTime);
            this._gainNode.gain.setValueAtTime(0.0, this._context.currentTime);
        }
    }

    unmute() {
        this.isMuted = false;
        if (this._gainNode) { this._setGains(this._context.currentTime); }
    }

    toggleMuteUnmute() {
        if (this.isMuted) {
            this.muteSelected = false;
            this.unmute();
        } else {
            this.muteSelected = true;
            this.mute();
        }
    }

    prepareAudioGraph(context) {
        if (context === undefined) context = this._context;

        this._sourceNode = context.createBufferSource();
        this._sourceNode.buffer = this._buffer;

        let this_ = this;
        this._sourceNode.onended = () => this_._audioEnded();

        if (!context.createGain) context.createGain = context.createGainNode;

        this._gainNode = context.createGain();

        // Source --> Gain Node --> MultiTrack Gain Node (--> AudioContext, this happens in multitrack.js)
        this._sourceNode.connect(this._gainNode);
        this._gainNode.connect(context.destination);

        this._setGains(context.currentTime);
    }

    _setGains(currentTime) {
        let envelopeData = this._timeline.tracks[0].layers[2].data;

        var this_ = this;
        $.each(envelopeData, function (i, v) {
            let y_ = Math.min(v.y, 1.0);
            y_ = Math.max(y_, 0.0);

            let x_ = Math.min(v.x, this_._buffer.duration);
            x_ = Math.max(v.x, 0.0);

            envelopeData[i] = {x: x_, y: y_};
        });

        if (!this._gainNode) { return; }

        if (this.isMuted) {
            this._gainNode.gain.setValueAtTime(0, currentTime);
            return;
        }

        if (envelopeData[0].x <= 0.1 ) {
            this._gainNode.gain.setValueAtTime(envelopeData[0].y, currentTime);
        }

        $.each(envelopeData, function(_, v) {
            this_._gainNode.gain.linearRampToValueAtTime(v.y * this_._gainMax, currentTime + v.x);
        });
    }

    clearAudioGraph() {
        if (this._sourceNode) {
            this._sourceNode.disconnect();
            try {
                this._sourceNode.stop();
            } catch (err) {
                console.log('Tried to stop a node that is not playing...');
            }
            this._sourceNode = null;
        }

        if (this._gainNode) {
            this._gainNode.disconnect();
            this._gainNode = null;
        }
    }

    _playAudio() {
        this.prepareAudioGraph();

        let offset = this._pausedAt;
        if (!this._sourceNode.start) {
            this._sourceNode.noteOn(0);
            console.log('Cannot use SourceNode.start()!')
        } else {
            this._sourceNode.start(0, this.cursorPosition);
        }

        this._startedAt = this._context.currentTime - offset;
        this._pausedAt = 0;
    }

    getCurrentTime() {
        if(this._pausedAt) return this._pausedAt;
        else if(this._startedAt) return this._context.currentTime - this._startedAt;
        else return 0;
    }

    _pauseAudio() {
        this.clearAudioGraph();
        this._pausedAt = this._context.currentTime - this._startedAt;
    }

    _stopAudio() {
        this.clearAudioGraph();
        this._startedAt = 0;
        this._pausedAt = 0;
        this.cursorPosition = 0;
    }

    _audioEnded() {
        this.stop();
        this.audioEndCallback();
    }
}