var InteractiveAudioLab = namespace('InteractiveAudioLab');
var WebUnmixingToolbox = namespace('InteractiveAudioLab.WebUnmixingToolbox');
var Main = namespace('InteractiveAudioLab.WebUnmixingToolbox.Main');

var mixture_waveform = Object.create(WaveSurfer);
var result_waveform = Object.create(WaveSurfer);
var all_waveforms = [mixture_waveform, result_waveform];
var defaultZoomStart;
var zoomStepSize = 5;
var spectrogram = new SpectrogramHeatmap('spectrogram', 20000);
var pca = new PCAHeatmap('pca', 100);
var pca_tf_indices;
var spec_dims;

var socket;
var time_to_graph = 0.0;
var spec_as_image = false;

var whiteLine = 'rgba(245, 245, 245, 1)';
var whiteFill = 'rgba(255, 255, 255, 0.35)';
var greenLine = 'rgba(0, 255, 0, 1)';
var greenFill = 'rgba(0, 255, 0, 0.35)';

var colorDict = {'white': {'line': whiteLine, 'fill': whiteFill },
                 'green': {'line': greenLine, 'fill': greenFill } };

var TAKE_THIS_OUT_ONLY_FOR_KILLING_CODE_WHILE_TESTING = false

pcaMatrixToHistogram = (pca) => {
    // max = Math.max(...pca.map(row => Math.max(...row.map(inds => inds.length))))
    return pca.map(row => row.map(inds => Math.log(inds.length + 0.0000000001)))
}

var currTime = () => {
    let time = new Date();
    return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds()
}

$(document).ready(function() {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	online = new AudioContext();

	context = online;

  socket_namespace = '/wut';
  socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + socket_namespace);

  socket.on('connect', function() {
      console.log('Socket connected.');
  });

  socket.on('audio_upload_ok', function () {
      $('#status').text('Audio uploaded to server.');
      console.log(currTime())
  });

  socket.on('bad_file', function () {
      console.log('File rejected by server');
  });

  socket.on('pca', function(message) {
    console.log('Got PCA');
    console.log(currTime())
    pca_tf_indices = JSON.parse(message)

    // console.log(`Indices before: ${pca_tf_indices.slice(0, 5)}`)
    let hist = pcaMatrixToHistogram(pca_tf_indices)
    // console.log(`Hist After: ${hist.slice(0, 5)}`)

    make_pca(pca, hist)
  });

  socket.on('spec', function(message) {
    console.log('Got SPECTROGRAM');
    console.log(currTime())
    spec_data = JSON.parse(message);
    spec_dims = [spec_data.length, spec_data[0].length]
    console.log(`About to draw spectrogram: ${currTime()}`)
    // make_spectrogram(spectrogram, spec_data, 15)
    console.log(`Drew spectrogram: ${currTime()}`)
    getMelSpectrogramAsImage(spectrogram, undefined, undefined);
  });
});

document.addEventListener('DOMContentLoaded', function () {

    var mixtureOptions = {
        container: '#waveform',
        waveColor: 'grey',
        progressColor: 'black',
        cursorColor: 'pink',
        scrollParent: false,
        height: 80,
        normalize: true,
        audioRate: 1.0,
        minPxPerSec: 0,
        responsive: true
    };

    // Init mixture_waveform
    mixture_waveform.init(mixtureOptions);
    defaulZoomStart = mixture_waveform.params.minPxPerSec;

    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
});


$( window ).resize(function() {
    let update = { width: $('pca').width() };
    Plotly.relayout("pca", update);
    Plotly.relayout("spectrogram", update);
});

// ~~~~~~~~~~~~~ WAVEFORM ~~~~~~~~~~~~~

mixture_waveform.on('ready', function () {
  var timeline = Object.create(WaveSurfer.Timeline);

  timeline.init({
    wavesurfer: mixture_waveform,
    container: '#waveform'
  });
});

// resize with half second lag
// kills audio, could have it pick up where left off later
// also may want to write own debouncing function instead of
// importing Lodash for it
$(window).resize(_.debounce(function(){
    if(mixture_waveform) {
        mixture_waveform.empty();
        mixture_waveform.drawBuffer();
    }
  }, 500));

//  ~~~~~~~~~~~~~ MODAL ~~~~~~~~~~~~~

$('.upload').click(function(){
    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
    openFileDialog();
});

$('#open-button-modal').click(function () {
    openFileDialog();
});

function openFileDialog() {
    // $('#survey')[0].reset();
    // $('#extraction-goal').multiselect('deselectAll', false);
    audio.import_audio();
    $('#status').text('Uploading audio to server...');
}



// ~~~~~~~~~~~~~ AUDIO ~~~~~~~~~~~~~

// $('#mixture-play').click(function() {
//     if (!mixture_waveform.backend.buffer) {
//         return;
//     }

//     if (!mixture_waveform.isPlaying()) {
//         // Audio is paused
//         $('#mixture-play').find("i").removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause')
//             .attr('title', 'Pause audio');
//     } else {
//         // Audio is playing
//         $('#mixture-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
//             .attr('title', 'Play audio');
//     }
//     mixture_waveform.playPause();
// });

// $('#mixture-stop').click(function() {
//     if (!mixture_waveform.backend.buffer) {
//         return;
//     }

//     if (mixture_waveform.isPlaying()) {
//         $('#mixture-play').find("i").removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play')
//             .attr('title', 'Play audio');
//         mixture_waveform.stop();
//     }

//     mixture_waveform.seekTo(0);
// });


// audio.playPause = function () {
//     togglePlayPauseIcon();
//     mixture_waveform.playPause();
// };

// audio.isPlaying = function () {
//     var playing = true;
//     this.waveforms.forEach( function (w) {
//         playing = playing && w.isPlaying();
//     });
//     return playing;
// };

// function togglePlayPauseIcon() {
//     if (!audio.isPlaying()) {
//         // Audio is paused
//         $('#play_icon').removeClass('glyphicon glyphicon-play').addClass('glyphicon glyphicon-pause');
//         $('#play_button').attr('title', 'Pause audio');
//     } else {
//         // Audio is playing
//         $('#play_icon').removeClass('glyphicon glyphicon-pause').addClass('glyphicon glyphicon-play');
//         $('#play_button').attr('title', 'Play audio');
//     }
// }

// function playPauseButton() {
//     if (mixture_audio_file.file !== null) {
//         audio.playPause();
//     }
// }

// function stopButton() {
//     if (audio.isPlaying()) {
//         togglePlayPauseIcon();
//         mixture_waveform.stop();
//     } else {
//         mixture_waveform.seekTo(0);
//     }
// }
