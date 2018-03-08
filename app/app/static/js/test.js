var InteractiveAudioLab = namespace('InteractiveAudioLab');
var WebUnmixingToolbox = namespace('InteractiveAudioLab.WebUnmixingToolbox');
var Main = namespace('InteractiveAudioLab.WebUnmixingToolbox.Main');

var all_waveforms = [mixture_waveform, result_waveform];
var defaultZoomStart;
var zoomStepSize = 5;
var spectrogram = new ScatterSpectrogram('spectrogram', 150);
var pca = new PCAHeatmap('pca', 100);
var pca_tf_indices;
var spec_dims;
var spectrogram_data;

var socket;
var time_to_graph = 0.0;
var spec_as_image = false;

var whiteLine = 'rgba(245, 245, 245, 1)';
var whiteFill = 'rgba(255, 255, 255, 0.35)';
var greenLine = 'rgba(0, 255, 0, 1)';
var greenFill = 'rgba(0, 255, 0, 0.35)';

var colorDict = {'white': {'line': whiteLine, 'fill': whiteFill },
                 'green': {'line': greenLine, 'fill': greenFill } };

var surferOptions = {
    container: '#mixture-waveform',
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

var mixture_waveform = new Waveform('#mixture-waveform', '#mixture-play', '#mixture-stop')
var result_waveform = new Waveform('#results-waveform', '#results-play', '#results-stop', '#results-spinner')

pcaMatrixToHistogram = (pca) => {
    return pca.map(row => row.map(inds => Math.log(inds.length + 1)))
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

  socket.on('bad_file', function () {
      console.log('File rejected by server');
  });

  socket.on('pca', function(message) {
    console.log(`Got PCA - ${currTime()}`);
    pca_tf_indices = JSON.parse(message)

    let hist = pcaMatrixToHistogram(pca_tf_indices)
    make_pca(pca, hist)
  });

  socket.on('mel', function(message) {
    console.log(`Got Spectrogram - ${currTime()}`);
    spectrogram_data = JSON.parse(message);
    spec_dims = [spectrogram_data.length, spectrogram_data[0].length]

    spectrogram._rawData = spectrogram_data;
    spectrogram.dims = spec_dims;

    // currently hardcoding in max mel freq
    getMelScatterSpectrogramAsImage(spectrogram, spec_dims[1], 150, mixture_waveform.surfer.backend.getDuration());
  });


  socket.on('masked_audio', function(message) {
    result_waveform.load('./get_masked_audio?val=' + Math.random().toString(36).substring(7))
  });
});

document.addEventListener('DOMContentLoaded', function () {
    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
});


function relayoutPlots() {
    let update = { width: $('#pca').width() };
    Plotly.relayout("pca", update);
    update = { width: $('#spectrogram').width() };
    Plotly.relayout("spectrogram", update);
}

$( window ).resize(function() {
    relayoutPlots()
});

// ~~~~~~~~~~~~~ WAVEFORM ~~~~~~~~~~~~~

// resize with half second lag
// kills audio, could have it pick up where left off later
// also may want to write own debouncing function instead of
// importing Lodash for it
$(window).resize(_.debounce(function(){
    mixture_waveform.resizeWaveform();
    result_waveform.resizeWaveform();
  }, 500));

//  ~~~~~~~~~~~~~ MODAL ~~~~~~~~~~~~~

$('#upload').click(function(){
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
    audio.import_audio();
}

//  ~~~~~~~~~~~~~ Apply Selections button ~~~~~~~~~~~~~

$('#apply-selections').click(function(){
    // probably a better way to check this in the future
    if(!$('#apply-selections').hasClass('disabled')) {
        result_waveform.setLoading(true)

        let mask = spectrogram.exportSelectionMask()
        socket.emit('mask', { mask: mask })
    }
});
