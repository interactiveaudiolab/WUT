var InteractiveAudioLab = namespace('InteractiveAudioLab');
var WebUnmixingToolbox = namespace('InteractiveAudioLab.WebUnmixingToolbox');
var Main = namespace('InteractiveAudioLab.WebUnmixingToolbox.Main');

var mixture_waveform = Object.create(WaveSurfer);
var result_waveform = Object.create(WaveSurfer);
var all_waveforms = [mixture_waveform, result_waveform];
var defaultZoomStart;
var zoomStepSize = 5;
// var mixture_spectrogram_heatmap = new SpectrogramHeatmap('spectrogram-heatmap', 20000);
var result_spectrogram_heatmap = new SpectrogramHeatmap('result-spectrogram-heatmap', 20000);
var pca = new PCAHeatmap('pca', 100);

var socket;
var time_to_graph = 0.0;
var spec_as_image = false;

// MATRIX OPERATIONS

// generate n x m matrix with values given by function
makeMatrix = (height, width) => (gen) => 
    [...new Array(height)].map(() => [... new Array(width)].map(gen))

// generate n x m matrix with random values having a non-inclusive max
randomMatrix = (height, width, max) => 
    makeMatrix(height, width)(() => Math.floor(Math.random() * max))

// takes TF x 2 array with values in range [0, max]
// returns max x max matrix

tfToMatrix = (tfArray, max) => {
    pca = makeMatrix(max, max)(() => [])
    // console.log(tfArray)
    tfArray.forEach(([x, y], tfIndex) => {
        pca[x][y] = pca[x][y].concat([tfIndex])
    });

    return pca
}

pcaToHistrogram = (pca) => {
    max = Math.max(...pca.map(row => Math.max(...row.map(inds => inds.length))))
    console.log(max)

    console.log(pca.map(row => row.map(inds => inds.length)))
    return pca.map(row => row.map(inds => inds.length/max))
}

tf = randomMatrix(100, 2, 5)

pca = tfToMatrix(tf, 5)

hist = pcaToHistrogram(pca)

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
      $('#general-status').text('Audio uploaded to server.');
  });

  socket.on('bad_file', function () {
      console.log('File rejected by server');
  });

  // FAKING HEATMAP
  make_pca(pca, randomMatrix(100, 100, 5))
});

document.addEventListener('DOMContentLoaded', function () {

    var mixtureOptions = {
        container: document.querySelector('#mixture-waveform'),
        waveColor: 'blue',
        progressColor: 'navy',
        cursorColor: 'black',
        scrollParent: false,
        height: 80,
        normalize: true,
        audioRate: 1.0
    };

    // Init mixture_waveform
    mixture_waveform.init(mixtureOptions);
    defaulZoomStart = mixture_waveform.params.minPxPerSec;

    // Init result_waveform
    var resultOptions = {
        container: document.querySelector('#result-waveform'),
        waveColor: 'blue',
        progressColor: 'navy',
        cursorColor: 'black',
        scrollParent: false,
        height: 120,
        normalize: true,
        audioRate: 1.0
    };

    result_waveform.init(resultOptions);
});

mixture_waveform.on('ready', function () {
  var timeline = Object.create(WaveSurfer.Timeline);

  timeline.init({
    wavesurfer: mixture_waveform,
    container: '#waveform-timeline'
  });
});

$('#privacy-policy-link').click(function(){
    $('#privacy-modal').modal({
        backdrop: 'static'
    });
});

$('#mixture-zoom-in').click(function(){
    mixture_waveform.zoom(mixture_waveform.params.minPxPerSec + zoomStepSize);
});

$('#mixture-zoom-out').click(function(){
    mixture_waveform.zoom(mixture_waveform.params.minPxPerSec - zoomStepSize);
});

function enableTools(enabled, className) {
    if (enabled === true) {
        $(className).removeClass('disabled');
    }
    else if (enabled === false) {
        $(className).addClass('disabled');
    }
}

$('#results-pill').click(function() {
    $(this).removeClass('result-ready');
});

$('#import-audio').click(function(){
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
    $('#survey')[0].reset();
    $('#extraction-goal').multiselect('deselectAll', false);
    audio.import_audio();
    $('#general-status').text('Uploading audio to server...');
}