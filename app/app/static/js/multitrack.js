
var trackList = [];

function initMultiTrackWithRandom(url) {
    loader.load(url).then(function(buffer) {
        let slider = $('#transport-slider');
        // slider.attr('data-slider-max', buffer.duration);
        let ticks = calculateTicks(buffer.duration, 4);
        slider.bootstrapSlider({
            max: buffer.duration,
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

        let tracks = $('.waves-ui-track');
        $.each(tracks, function(k, t) {
            // Fake data
            var data = [];
            let n = 7;
            for (i=0; i <= n; ++i) {
                data.push({ x: i * buffer.duration / n, y: Math.random() });
            }

            let new_track = new Track(buffer, t, data, slider, audioEnded);
            trackList.push(new_track);
        });

    }).catch(function(err) {
        console.error(err.stack);
    });
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
    $.each(trackList, function(_, t) {
        t.cursorPosition = event.value.newValue;
    });
}

$('#req-play').click(function () {
    togglePlayPauseIcon(this);

    $.each(trackList, function(_, t) {
        t.togglePlayPause();
    });

});

function audioEnded() {
    togglePlayPauseIcon($('#req-play'));
}

function stopAll() {
    $.each(trackList, function (_, t) {
        if (!t.isStopped()) t.stop();
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
    let idx = parseInt($(this).parent().parent().siblings().children()[0].id.split('-')[1]) - 1;

    trackList[idx].toggleMuteUnmute();
    togglePrimaryBtn(this);
});

$('.solo-track').click(function () {
    let idx = parseInt($(this).parent().parent().siblings().children()[0].id.split('-')[1]) - 1;

    trackList[idx].isSoloed = !trackList[idx].isSoloed;

    $.each(trackList, function(i, t) {
        if (i !== idx && !t.isSoloed) {
            if (trackList[idx].isSoloed) {
                t.mute();
            } else {
                t.unmute();
            }
        }
    });

    togglePrimaryBtn(this);
});

function togglePrimaryBtn(obj) {
    $.each(trackList, function(_, t) { console.log({'soloed': t.isSoloed, 'muted': t.isMuted}); });
    if (!$(obj).hasClass('btn-primary')) {
        $(obj).addClass('btn-primary');
    } else {
        $(obj).removeClass('btn-primary');
    }
}