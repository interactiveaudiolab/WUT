
var trackList = {};

function emptyMultiTrack() {

    makeSlider();

    let demoParams = ['repet_sim', 'projet', 'melodia'];
    let context = new (window.AudioContext || window.webkitAudioContext)();

    let sr = context.sampleRate;
    let dur = mixture_waveform.backend.getDuration();

    $.each(demoParams, function(_, algName) {
        let buffer = context.createBuffer(2, sr * dur, sr);
        let trackID = $('#' + algName)[0];
        let initialEnvelope = [{x: 0, y: 0.8}, {x: buffer.duration, y: 0.8}];
        trackList[algName] = new Track(buffer, context, trackID,
            initialEnvelope, $('#transport-slider'), audioEnded, demoParams.length);
    });

}


function initMultiTrack() {

    let demoParams = ['repet_sim', 'projet', 'melodia'];
    let demoUrl = '/separated_source_demo?method=';

    $.each(demoParams, function(_, algName) {
        let url = demoUrl + algName;
        loader.load(url).then(function (buffer) {

            trackList[algName].changeWaveformBuffer(buffer, 0);
            socket.emit('get_recommendations', {'algorithm': algName});
        });
    });

}

function addEnvelopeData(envelopeData, trackID) {
    trackList[trackID].setEnvelopeData(envelopeData);

    // Highlight the recommendations button
    $('#' + trackID).parent().parent().find('.toggle-reqs').addClass('btn-primary').removeClass('disabled');
}

function makeSlider() {
    let duration = mixture_waveform.backend.getDuration();

    // Set the transport slider to the same width as the tracks
    let width = $('.waves-ui-track').actual( 'width' );
    $('#transport-slider-wrapper').width(width);
    $('#ticks-wrapper').width(width);

    let slider = $('#transport-slider');
    let ticks = $('.time');
    let numTicks = ticks.length;
    ticks.each(function(i, v) {
        $(v).text(formatTick((i / (numTicks - 1)) * duration));
    });

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
    $.each(trackList, function(_, track) {
        track.cursorPosition = event.value.newValue;
    });
}

$('#req-play').click(function () {
    togglePlayPauseIcon(this);

    $.each(trackList, function(_, track) {
        track.togglePlayPause();
    });

});

function audioEnded() {
    togglePlayPauseIcon($('#req-play'));
}

function stopAll() {
    $.each(trackList, function (_, track) {
        if (!track.isStopped()) track.stop();
    });

    // Remove the play icon
    $('#req-play').find('i').removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
}

$('.toggle-reqs').click(function () {
    if (!$(this).hasClass('disabled')) {
        var selectedID = $(this).parent().parent().siblings().children()[0].id;
        trackList[selectedID].toggleEnvelopeData();
        togglePrimaryBtn(this);
    }
});

$('#req-stop').click(function () {
    // Make this look like an 'event'...
    setTransport({value: {newValue: 0.0}});
});

$('.mute-track').click(function () {
    // THIS IS A BIG OLE HACK!
    var selectedID = $(this).parent().parent().siblings().children()[0].id;
    togglePrimaryBtn(this);
    trackList[selectedID].muteSelected = $(this).hasClass('btn-primary');

    let anySoloed = false, noneSoloed = true;
    for (let t in trackList) {
        t = trackList[t];
        anySoloed |= t.isSoloed;
        noneSoloed &= !t.soloSelected;
    }

    if (trackList[selectedID].muteSelected) {
        trackList[selectedID].mute();
        trackList[selectedID].muteEnvelopeData();
    }  else if((anySoloed && !trackList[selectedID].isSoloed) || noneSoloed) {
        // mute unselected
        // Only time we unmute is if any track is soloed and it is not this track, or if no one is soloed
        trackList[selectedID].unmute();
        trackList[selectedID].unmuteEnvelopeData();
    }
});

$('.solo-track').click(function () {
    let selectedID = $(this).parent().parent().siblings().children()[0].id;
    let unselectedIDs = $(this).parent().parent().siblings().children();

    trackList[selectedID].isSoloed = !trackList[selectedID].isSoloed;
    trackList[selectedID].soloSelected = trackList[selectedID].isSoloed;

    let allSoloed = true, noneSoloed = true, anySoloed = false;
    for (let t in trackList) {
        t = trackList[t];
        allSoloed &= t.isSoloed;
        noneSoloed &= !t.soloSelected;
        anySoloed |= t.isSoloed;
    }

    for (let t in trackList) {
        t = trackList[t];

        if (allSoloed || noneSoloed) {
            t.unmute();
            t.unmuteEnvelopeData();
        } else {
            if (t.isSoloed) {
                t.unmute();
                t.unmuteEnvelopeData();
            } else {
                t.mute();
                t.muteEnvelopeData();
            }
        }

        if (t.muteSelected) {
            t.mute();
            t.muteEnvelopeData();
        }
    }

    togglePrimaryBtn(this);
});

function togglePrimaryBtn(obj) {
    // $.each(trackList, function(id, t) {
    //     console.log('id: {0}, s: {1}, m: {2}, sel: {3}'.format(id, t.isSoloed, t.isMuted, t.muteSelected) );
    // });

    if (!$(obj).hasClass('btn-primary')) {
        $(obj).addClass('btn-primary');
    } else {
        $(obj).removeClass('btn-primary');
    }
}

$('#req-save').click(function () {
    let offline = new OfflineAudioContext(2,44100*40,44100);

    $.each(trackList, function(id, t) {
        t.prepareAudioGraph(offline);
    });

    offline.startRendering().then(function(renderedBuffer) {
        // let bufferSrc = offline.createBuffer();
        // bufferSrc.buffer = renderedBuffer;

        let blob = bufferToWave(renderedBuffer, 0.0, renderedBuffer.length);
        saveAs(blob, 'wut_result.wav', false);

        // let recorder = new Recorder(bufferSrc);
        // recorder.exportWAV(function(blob) {
        //     saveAs(blob, 'wut_result.wav', false);
        // });
        $.each(trackList, function(id, t) {
            t.clearAudioGraph();
        });
    });

});