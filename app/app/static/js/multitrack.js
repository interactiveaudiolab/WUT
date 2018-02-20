
var trackList = {};
// var trackList_ = {};

function initMultiTrackWithRandom(url) {
    loader.load(url).then(function(buffer) {
        makeSlider();
        let context = mixture_waveform.backend.getAudioContext();

        let tracks = $('.waves-ui-track');
        $.each(tracks, function(k, t) {
            // Fake data
            var data = [];
            let n = 7;
            for (i=0; i <= n; ++i) {
                data.push({ x: i * buffer.duration / n, y: Math.random() });
            }

            let new_track = new Track(buffer, context, t, data, $('#transport-slider'), audioEnded);
            let id = t.attr('id');
            trackList[id] = new_track;
        });

    }).catch(function(err) {
        console.error(err.stack);
    });
}

function emptyMultiTrack() {

    makeSlider();

    let demoParams = ['repet_sim', 'projet', 'melodia'];
    let context = mixture_waveform.backend.getAudioContext();
    let sr = context.sampleRate;
    let dur = mixture_waveform.backend.getDuration();

    $.each(demoParams, function(_, algName) {
        let buffer = context.createBuffer(1, sr * dur, sr);
        let id = $('#' + algName)[0];
        let initialData = [{x: 0, y: 0.8}, {x: buffer.duration, y: 0.8}];
        trackList[algName] = new Track(buffer, context, id, initialData, $('#transport-slider'), audioEnded);
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
}

function makeSlider() {
    let duration = mixture_waveform.backend.getDuration();

    let slider = $('#transport-slider');
    let ticks = calculateTicks(duration, 4);
    slider.bootstrapSlider({
        max: duration,
        ticks: ticks,
        tick_labels: ticks.map(String),
        formatter: function (value) {
            let min = String(Math.floor(value / 60));
            let sec = truncateFloat(value % 60, 2);
            sec = sec < 10 ? "0" + String(sec) : String(sec);
            return min + ":" + sec;
        }
    });
    slider.on("change", setTransport);

}

function calculateTicks(duration, divisor) {
    let result = [];

    let val = duration / divisor;
    let i = 0.0;

    while (i < duration) {
        result.push(i);
        i += val;
    }
    result.push(duration);
    return result;
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

$('#req-stop').click(function () {
    stopAll();
});

$('.mute-track').click(function () {
    // THIS IS A BIG OLE HACK!
    let id = $(this).parent().parent().siblings().children()[0].id;

    trackList[id].toggleMuteUnmute();
    trackList[id].toggleEnvelopeData();
    togglePrimaryBtn(this);
});

$('.solo-track').click(function () {
    let id = $(this).parent().parent().siblings().children()[0].id;

    trackList[id].isSoloed = !trackList[id].isSoloed;

    $.each(trackList, function(key_id, track) {
        if (key_id !== id && !track.isSoloed) {
            if (trackList[id].isSoloed) {
                track.mute();
                track.hideEnvelopeData();
            } else {
                track.unmute();
                track.showEnvelopeData();
            }
        }
    });

    togglePrimaryBtn(this);
});

function togglePrimaryBtn(obj) {
    // $.each(trackList, function(_, t) { console.log({'soloed': t.isSoloed, 'muted': t.isMuted}); });
    if (!$(obj).hasClass('btn-primary')) {
        $(obj).addClass('btn-primary');
    } else {
        $(obj).removeClass('btn-primary');
    }
}