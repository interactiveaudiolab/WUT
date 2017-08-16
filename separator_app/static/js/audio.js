var audio = {waveforms: all_waveforms, progress: 0, start_time: -1};
var mixture_audio_file = {file:null, url:null};
var AUDIOFILES;
var BUFFERS;
var context;

var bufferLoader;
var bufferList;

audio.import_audio = function() {
    if (this.isPlaying()) {
        this.playPause();
    }
    $('input[type=file]').click();
    // buffer_loader_load(mixture_audio_file.url);
};

$(window).keypress(function (e) {
    if (e.keyCode === 0 || e.keyCode === 32) {
        e.preventDefault();
        console.log('Space pressed');
        audio.playPause();
    }
});

$('#input_audio_file').change(function () {
    mixture_audio_file.file = this.files[0];
    mixture_audio_file.url = URL.createObjectURL(mixture_audio_file.file);

    $("#filename").text(mixture_audio_file.file.name + " Waveform");
    mixture_waveform.load(mixture_audio_file.url);
    mixture_audio_file.upload_to_server(this);
});

mixture_audio_file.upload_to_server = function (obj) {
    var form_data = new FormData();
    if($(obj).prop('files').length > 0)
    {
        file = $(obj).prop('files')[0];
        form_data.append("audio_file", file);
    }

    $.ajax({
        url: '/audio_upload',
        type: "POST",
        data: form_data,
        processData: false,
        contentType: false,
        success: function (result) {
            console.log('/audio_upload POST done!');
            $('#audio_upload_status').text('Upload complete! Waiting for spectrogram...');
            getSpectrogram();
        }
    });
};

audio.playPause = function () {
    togglePlayPauseIcon();
    mixture_waveform.playPause();
};

audio.isPlaying = function () {
    var playing = true;
    this.waveforms.forEach( function (w) {
        playing = playing && w.isPlaying();
    });
    return playing;
};

function togglePlayPauseIcon() {
    if (!audio.isPlaying()) {
        // Audio is paused
        $('#play_icon').removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause');
        $('#play_button').attr('title', 'Pause audio');
    } else {
        // Audio is playing
        $('#play_icon').removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play');
        $('#play_button').attr('title', 'Play audio');
    }
}

function playPauseButton() {
    if (mixture_audio_file.file !== null) {
        audio.playPause();
    }
}

function stopButton() {
    if (audio.isPlaying()) {
        togglePlayPauseIcon();
        mixture_waveform.stop();
    } else {
        mixture_waveform.seekTo(0);
    }
}

function setMixtureVolume(val) {
    mixture_waveform.setVolume(val);
}

 mixture_waveform.on('pause', function () {
     mixture_waveform.params.container.style.opacity = 0.8;
 });

 mixture_waveform.on('play', function () {
     mixture_waveform.params.container.style.opacity = 1.0;
 });

mixture_waveform.on('finish', function () {
    $('#play_icon').removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play');
    mixture_waveform.seekTo(0);
});

function buffer_loader_load(url) {
    AUDIOFILES = [url];
    bufferLoader = new BufferLoader (
        context,
        AUDIOFILES,
        finishedLoading
    );
    bufferLoader.load();
    function finishedLoading(bufferList) {
        BUFFERS = bufferList.slice(0);
        offline = new OfflineAudioContext(2, Math.round(BUFFERS[0].length * 1.2), 44100);
        // readyWave();
    }
}

function get_audio_data () {
    if (bufferLoader === null || bufferLoader.bufferList === null
        || bufferLoader.bufferList[0] === null) {
        return -1;
    }

    var n_channels = bufferLoader.bufferList[0].numberOfChannels;
    var len = bufferLoader.bufferList[0].length;
    // var audio_data = Array.matrix(n_channels, len, 0.0);

    n_channels = 1;
    var audio_data = bufferLoader.bufferList[0].getChannelData(0);

    // for (var i = 0; i <= n_channels; i++) {
    //     for (var i = Things.length - 1; i >= 0; i--) {
    //         audio_data[i] = bufferLoader.bufferList[0].getChannelData(i);
    //     };
    // };

    return [audio_data, bufferLoader.bufferList[0].sampleRate];
}
