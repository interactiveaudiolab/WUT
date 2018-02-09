var audio = {waveforms: all_waveforms};
var mixture_audio_file = {file:null, url:null};
var AUDIOFILES;
var BUFFERS;
var context;

var bufferLoader;
var spec_data;

var trackList = [];

var DO_STFT_ON_CLIENT = false;


audio.import_audio = function() {
    if (this.isPlaying()) {
        this.playPause();
    }
    $('input[type=file]').click();
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

$('#input_audio_file').change(function () {
    time_to_graph = new Date().getTime();
    mixture_audio_file.file = this.files[0];
    mixture_audio_file.url = URL.createObjectURL(mixture_audio_file.file);
    if (DO_STFT_ON_CLIENT) {
        buffer_loader_load(mixture_audio_file.url);
    }

    loader.load(mixture_audio_file.url).then(function(buffer) {
        let tracks = $('.waves-ui-track');
        $.each(tracks, function(k, t) {
            // Fake data
            var data = [];
            let n = 7;
            for (i=0; i <= n; ++i) {
                data.push({ x: i * buffer.duration / n, y: Math.random() });
            }

            let new_track = new Track(buffer, t, data);
            trackList.push(new_track);

        });
    }).catch(function(err) {
        console.error(err.stack);
    });

    $("#filename").text(mixture_audio_file.file.name);
    $('#extraction-goal').multiselect('enable');
    mixture_waveform.load(mixture_audio_file.url);
    mixture_audio_file.upload_to_server(this);
});

mixture_audio_file.upload_to_server = function (obj) {
    if($(obj).prop('files').length > 0)
    {
        file = $(obj).prop('files')[0];
        file_with_metadata = {
            'file_name': file.name,
            'file_size': file.size,
            'file_type': file.type,
            'file_data': file };
        socket.emit('audio_upload', {'audio_file': file_with_metadata});
    }
    else {
        socket.emit('audio_upload', {'audio_file': null});
    }
};

$('#result-play').click(function() {
    if (!result_waveform.backend.buffer) {
        return;
    }

    if (!result_waveform.isPlaying()) {
        // Audio is paused
        $('#result-play').find("i").removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause')
            .attr('title', 'Pause audio');
    } else {
        // Audio is playing
        $('#result-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
    }
    result_waveform.playPause();
});

$('#mixture-play').click(function() {
    if (!mixture_waveform.backend.buffer) {
        return;
    }
    togglePlayPauseIcon(this);

    mixture_waveform.playPause();
});

$('#req-play').click(function () {
    togglePlayPauseIcon(this);

    // if ($(this).find('i').hasClass('glyphicon-pause')){ }

    $.each(trackList, function(v, t) {
        t.togglePlayPause();
    });

});

function togglePlayPauseIcon(obj) {
    if ($(obj).find('i').hasClass('glyphicon-play')) {
        $(obj).find('i').removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause')
            .attr('title', 'Pause audio');
    } else {
        $(obj).find('i').removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
    }
}

$('#mixture-stop').click(function() {
    if (!mixture_waveform.backend.buffer) {
        return;
    }

    if (mixture_waveform.isPlaying()) {
        $('#mixture-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
        mixture_waveform.stop();
    }

    mixture_waveform.seekTo(0);
});

$('#result-stop').click(function() {
    if (!result_waveform.backend.buffer) {
        return;
    }

    if (result_waveform.isPlaying()) {
        $('#result-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
        result_waveform.stop();
    }

    result_waveform.seekTo(0);
});

mixture_waveform.on('finish', function () {
    $('#mixture-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
    mixture_waveform.seekTo(0);
});

result_waveform.on('finish', function () {
    $('#result-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
            .attr('title', 'Play audio');
    result_waveform.seekTo(0);
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