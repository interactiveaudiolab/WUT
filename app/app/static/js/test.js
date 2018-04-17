var mixture_waveform = new Waveform('#mixture-waveform', '#mixture-play', '#mixture-stop')
var masked_waveform = new Waveform('#masked-waveform', '#masked-play', '#masked-stop', '#masked-spinner')
var inverse_waveform = new Waveform('#inverse-waveform', '#inverse-play', '#inverse-stop', '#inverse-spinner')

var all_waveforms = [mixture_waveform, masked_waveform, inverse_waveform];
var spectrogram = new ScatterSpectrogram('spectrogram');
var pca = new PCAHeatmap('pca');
pca.addLinkedSpectrogram(spectrogram)
var socket;

var whiteLine = 'rgba(245, 245, 245, 1)';
var whiteFill = 'rgba(255, 255, 255, 0.35)';
var greenLine = 'rgba(0, 255, 0, 1)';
var greenFill = 'rgba(0, 255, 0, 0.35)';

var colorDict = {'white': {'line': whiteLine, 'fill': whiteFill },
                 'green': {'line': greenLine, 'fill': greenFill } };

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
    indices = JSON.parse(message)

    pca.addTFIndices(indices);
    let hist = pcaMatrixToHistogram(pca.TFIndices)

    // pca of size 100 x 100
    make_pca(pca, hist, 100, 100)
  });

  socket.on('mel', function(message) {
    console.log('IN MEL SOCKET ACTION')
    let spec_data = JSON.parse(message);
    spectrogram.dims = [spec_data.length, spec_data[0].length]

    // currently hardcoding in max mel freq
    let durationInSecs = mixture_waveform.surfer.backend.getDuration();
    getMelScatterSpectrogramAsImage(spectrogram, spectrogram.dims[1], durationInSecs, 150);
  });

  socket.on('masked_audio', function(message) {
    masked_waveform.load('./get_masked_audio?val=' + Math.random().toString(36).substring(7))
  });

  socket.on('inverse_audio', function(message) {
    inverse_waveform.load('./get_inverse_audio?val=' + Math.random().toString(36).substring(7))
  });
});

document.addEventListener('DOMContentLoaded', function () {
    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
});


function relayoutPlots() {
    Plotly.relayout(pca.divID, { width: pca.DOMObject.width() });
    Plotly.relayout(spectrogram.divID, { width: spectrogram.DOMObject.width() });
}

// RESIZE PLOTS ON WINDOW CHANGE
$(window).resize(relayoutPlots);

// ~~~~~~~~~~~~~ WAVEFORM ~~~~~~~~~~~~~

// resize with half second lag
// kills audio, could have it pick up where left off later
// also may want to write own debouncing function instead of
// importing Lodash for it
$(window).resize(_.debounce(function(){
    mixture_waveform.resizeWaveform();
    masked_waveform.resizeWaveform();
    inverse_waveform.resizeWaveform();
  }, 500));

//  ~~~~~~~~~~~~~ MODAL ~~~~~~~~~~~~~

// $('#upload').click(function(){
//     $('#open-modal').modal({
//         backdrop: 'static',
//         keyboard: false
//     });
//     openFileDialog();
// });

// $('#open-button-modal').click(function () {
//     openFileDialog();
// });

// function openFileDialog() {
//     audio.import_audio();
// }

//  ~~~~~~~~~~~~~ Apply Selections button ~~~~~~~~~~~~~

$('#apply-selections').click(function(){
    // probably a better way to check this in the future
    if(!$('#apply-selections').hasClass('disabled')) {
        masked_waveform.setLoading(true);
        inverse_waveform.setLoading(true);

        socket.emit('mask', { mask: spectrogram.exportSelectionMask() });
    }
});