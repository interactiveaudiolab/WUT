var mixture_waveform = new Waveform('#mixture-waveform', '#mixture-play', '#mixture-stop')
var all_waveforms = [mixture_waveform];
var zoomStepSize = 5;
var mixture_spectrogram_heatmap = new SpectrogramHeatmap('spectrogram', 20000);
var dcSpectrogram = new ScatterSpectrogram('dc-spectrogram');
var dcPCA = new PCAHeatmap('pca');
dcPCA.addLinkedSpectrogram(dcSpectrogram)

var socket;
var loader;

// colors
var whiteLine = 'rgba(245, 245, 245, 1)';
var whiteFill = 'rgba(255, 255, 255, 0.35)';
var greenLine = 'rgba(0, 255, 0, 1)';
var greenFill = 'rgba(0, 255, 0, 0.35)';

var colorDict = {'white': {'line': whiteLine, 'fill': whiteFill },
                 'green': {'line': greenLine, 'fill': greenFill } };

$(document).ready(function() {
	loader = new wavesLoaders.AudioBufferLoader();

    // Set up sockets
    socket_namespace = '/wut';
    socket = io.connect(`${location.protocol}//${document.domain}:${location.port}${socket_namespace}`);

    socket.on('connect', () => console.log('Socket connected'));

    socket.on('disconnect', why => console.log(`Socket disconnected: ${why}`));

    socket.on('audio_upload_ok', () => {
        console.log('Audio uploaded to server');
        initMultiTrack();
    });

    socket.on('spectrogram', msg => {
        var data = JSON.parse(msg.spectrogram);
        make_spectrogram(mixture_spectrogram_heatmap, data, mixture_waveform.surfer.backend.getDuration());
    });

    socket.on('spectrogram_image_ready', msg => {
        getSpectrogramAsImage(mixture_spectrogram_heatmap, msg.max_freq);
    });

    socket.on('pca', msg => {
        indices = JSON.parse(msg)

        dcPCA.addTFIndices(indices);
        let hist = pcaMatrixToHistogram(dcPCA.TFIndices)

        // pca of size 100 x 100
        make_pca(dcPCA, hist, 100, 100)
    });

    socket.on('mel', msg => {
        let spec_data = JSON.parse(msg);
        dcSpectrogram.dims = [spec_data.length, spec_data[0].length]

        // currently hardcoding in max mel freq
        let durationInSecs = mixture_waveform.surfer.backend.getDuration();
        getMelScatterSpectrogramAsImage(dcSpectrogram, dcSpectrogram.dims[1], durationInSecs, 150);
    });

    socket.on('bad_file', () => console.log('File rejected by server'));

    socket.on('envelope_data', msg => addEnvelopeData(msg.envelopeData, msg.algorithm));

    socket.on('masked_audio', _ => {
        masked_waveform.load('./get_masked_audio?val=' + Math.random().toString(36).substring(7))
    });

    socket.on('inverse_audio', _ => {
        inverse_waveform.load('./get_inverse_audio?val=' + Math.random().toString(36).substring(7))
    });
});

function relayoutPlots() {
    resizeToContainer(dcPCA);
    resizeToContainer(dcSpectrogram);
    resizeToContainer(mixture_spectrogram_heatmap);
}

// RESIZE ON TAB CHANGE
// TODO: fix hacky implementation
$('.nav-link').on('click', () => {
    console.log('click on a tab');
    setTimeout(relayoutPlots, 180);
})

// RESIZE PLOTS ON WINDOW CHANGE
$(window).resize(relayoutPlots);

// ~~~~~~~~~~~~~ WAVEFORM ~~~~~~~~~~~~~

// resize with half second lag
// kills audio, could have it pick up where left off later
// also may want to write own debouncing function instead of
// importing Lodash for it
$(window).resize(_.debounce(() => mixture_waveform.resizeWaveform(), 500));

//  ~~~~~~~~~~~~~ Apply Selections button ~~~~~~~~~~~~~

$('#apply-dc-selections').click(function(){
    // probably a better way to check this in the future
    if(!$('#apply-dc-selections').hasClass('disabled')) {
        masked_waveform.setLoading(true);
        inverse_waveform.setLoading(true);

        socket.emit('mask', { mask: spectrogram.exportSelectionMask() });
    }
});

$('#apply-spec-selections').click(function(){
    // TODO: actually implement this after demo
    // currently do nothing, button not in use
});


mixture_waveform.surfer.on('ready', () => { emptyMultiTrack(); });

$('#results-pill').click(() => {
    $(this).removeClass('result-ready');
    result_waveform.drawBuffer();
});