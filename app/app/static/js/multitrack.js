var trackList = {};
var numTracks = 0;

function addTrack(id, name, url, color, load_recs=false) {
    numTracks++;
    color = color !== undefined ? color : 'SkyBlue';
    let sr = context.sampleRate;
    let maybeDur = mixture_waveform.surfer.backend.getDuration()
    let defaultDur = 10;
    let dur = maybeDur ? maybeDur : defaultDur;

    let buffer = context.createBuffer(2, sr * dur, sr);
    // newTrackHTML('track-container', id, name, color);
    // let trackID = $('#' + id)[0];
    let initialEnvelope = [{x: 0, y: 0.8}, {x: buffer.duration, y: 0.8}];
    trackList[id] = new Track(buffer, context, id, 'track-container', name,
        color, initialEnvelope, $('#transport-slider'), audioEnded, numTracks);

    for(let k of Object.keys(trackList)) {
        trackList[k]._gainMax = 1 / numTracks;
    }

    url != undefined && initTrack(id, url, load_recs);
}

function initTrack(id, url, load_recs=false) {
    loader.load(url).then(buffer => {
        trackList[id].changeWaveformBuffer(buffer, 0);
        if(load_recs) socket.emit('get_recommendations', { 'algorithm': id });
    });
}

function emptyMultiTrack() {
    makeSlider();
    $('#reqs-tab-bootstrap').removeClass('disabled');
}

function loadRecs() {
    let demoParams = ['repet_sim', 'projet', 'melodia'];
    let names = ['RepetSim', 'Projet', 'Melodia'];
    let colors = ['SkyBlue', 'PaleVioletRed', 'MediumSeaGreen'];
    let demoUrl = '/separated_source_demo?method=';
    numTracks = demoParams.length;

    $.each(demoParams, (i, algName) =>
        addTrack(algName, names[i], demoUrl + algName, colors[i], true));
}

function addEnvelopeData(envelopeData, trackID) {
    trackList[trackID].setEnvelopeData(envelopeData);
}

function makeSlider() {
    let duration = mixture_waveform.surfer.backend.getDuration();

    let slider = $('#transport-slider');
    let ticks = $('.time');
    let numTicks = ticks.length;
    ticks.each((i, v) => $(v).text(formatTick((i / (numTicks - 1)) * duration)));

    slider.bootstrapSlider({ max: duration });
    slider.on("change", setTransport);
}

function formatTick(value) {
    let min = addZero(Math.floor(value / 60));
    let sec = addZero(Math.floor(value % 60));
    return min + ":" + sec;
}

function addZero(value) {
    return value < 10 ? "0" + String(value) : String(value);
}

function setTransport(event) {
    stopAll();
    $.each(trackList, (_, track) => track.cursorPosition = event.value.newValue);
}

$('#req-play').click(function () {
    togglePlayPauseIcon(this);

    let num_soloed = Object.values(trackList).filter(x => x.isSoloed).length;
    let num_muted = Object.values(trackList).filter(x => x.isMuted).length;
    let num_playing = num_soloed > 0
        ? num_soloed
        : Object.keys(trackList).length - num_muted;
    for(let track of Object.values(trackList))
        track._gainMax = 1 / num_playing;

    $.each(trackList, (_, track) => track.togglePlayPause());
});

function audioEnded() { setPauseIcon($('#req-play')); }

function stopAll() {
    $.each(trackList, (_, track) => !track.isStopped() && track.stop());
    setPauseIcon($('#req-play'));
}

// Make this look like an 'event'...
$('#req-stop').click(() => setTransport({ value: { newValue: 0.0 } }));
$('#req-load').click(() => loadRecs());

function togglePrimaryBtn(obj) {
    !$(obj).hasClass('btn-primary')
        ? $(obj).addClass('btn-primary')
        : $(obj).removeClass('btn-primary');
}

$('#req-save').click(function () {
    let offline = new OfflineAudioContext(2,44100*40,44100);

    $.each(trackList, (_, t) => t.prepareAudioGraph(offline));

    offline.startRendering().then(renderedBuffer => {
        let blob = bufferToWave(renderedBuffer, 0.0, renderedBuffer.length);
        saveAs(blob, 'wut_result.wav', false);

        $.each(trackList, (_, t) => t.clearAudioGraph());
    });
});
