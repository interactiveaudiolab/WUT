var audio = {waveforms: all_waveforms, progress: 0, start_time: -1};
var mixture_audio_file = {file:null, url:null};
var AUDIOFILES;
var BUFFERS;
var context;

var bufferLoader;
var bufferList;
var spec_data;

var DO_STFT_ON_CLIENT = false;

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
    if (DO_STFT_ON_CLIENT) {
        buffer_loader_load(mixture_audio_file.url);
    }

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

    var upload_complete = false;

    $.ajax({
        url: '/audio_upload',
        type: "POST",
        data: form_data,
        processData: false,
        contentType: false,
        success: function (result) {
            console.log('/audio_upload POST done!');
            $('#general-status').text('Upload complete! Waiting for spectrogram...');
            upload_complete = result !== null;
        }
    }).then(function(result) {
        if (!DO_STFT_ON_CLIENT && upload_complete) {
            getSpectrogram();
        }
    }).then(function(result) {
        get2DFT();
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

$('#import-audio').click(function(){
    audio.import_audio();
    $('#general-status').text('Uploading audio to server...');
});

$('#mixture-stop').click(function() {
    if (!mixture_waveform.backend.buffer) {
        return;
    }

    if (mixture_waveform.isPlaying()) {
        $('#mixture-play-pause').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
        mixture_waveform.stop();
    }

    mixture_waveform.seekTo(0);
});

$('#mixture-play-pause').click(function() {
    if (!mixture_waveform.backend.buffer) {
        return;
    }

    if (!mixture_waveform.isPlaying()) {
        // Audio is paused
        $('#mixture-play-pause').find("i").removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause')
            .attr('title', 'Pause audio');
    } else {
        // Audio is playing
        $('#mixture-play-pause').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
    }
    mixture_waveform.playPause();
});

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
        function (bufferList) {
            let windowSize = 16384;
            let hopSize = windowSize / 2;
            let sampleRate = bufferList[0].sampleRate;
            var specLength = bufferList[0].length / bufferList[0].sampleRate;
            var selectedRange = [0.0, specLength];
            spec_data = display_ready_spectrogram(bufferList[0].getChannelData(0), windowSize, hopSize, 'hamm', sampleRate);
            drawSpectrogramPlotly("spectrogram-heatmap", spec_data.spectrogram, '', spec_data.freqMax, specLength, selectedRange, false);
        }
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

// FROM: https://stackoverflow.com/a/30045041
// Convert a audio-buffer segment to a Blob using WAVE representation
function bufferToWave(abuffer, offset, len) {

  var numOfChan = abuffer.numberOfChannels,
      length = len * numOfChan * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels = [], i, sample,
      pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this demo)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // update data chunk
      pos += 2;
    }
    offset++                                     // next source sample
  }

  // create Blob
  return new Blob([buffer], {type: "audio/wav"});

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}