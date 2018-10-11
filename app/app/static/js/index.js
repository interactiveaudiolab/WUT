var mixture_waveform = new Waveform('#mixture-waveform', '#mixture-play', '#mixture-stop');
var all_waveforms = [mixture_waveform];
var zoomStepSize = 5;
var mixture_spectrogram_heatmap = new SpectrogramHeatmap('spectrogram', 20000);
var dcSpectrogram = new ScatterSpectrogram('dc-spectrogram');
var dcPCA = new DCHeatmap2D('pca-2d');
dcPCA.addLinkedSpectrogram(dcSpectrogram);
var dcBar = new DC1DBar('pca-1d', 'slider-1d', 'dc-spectrogram-1d',
    {className: 'dc-1d-control', flipID: 'flip-1d',  logYCheck: 'log-y-1d',
        applyID: 'apply-dc-selections-1d', seeResultsID: 'see-results-1d'});

var socket;
var loader;
var context;
var firstUpload = false;

// colors
var whiteLine = 'rgba(245, 245, 245, 1)';
var whiteFill = 'rgba(255, 255, 255, 0.35)';
var greenLine = 'rgba(0, 255, 0, 1)';
var greenFill = 'rgba(0, 255, 0, 0.35)';

var colorDict = {'white': {'line': whiteLine, 'fill': whiteFill },
                 'green': {'line': greenLine, 'fill': greenFill } };

var bothSelected = false;

var selectionCounter = 0;

$(document).ready(function() {
    $('#audio-upload-modal-open').click(() => { if(!firstUpload) {
        context = new (window.AudioContext || window.webkitAudioContext)();
        firstUpload = true;
    }});

	loader = new wavesLoaders.AudioBufferLoader();

    // Set up sockets
    socket_namespace = '/wut';
    socket = io.connect(`${location.protocol}//${document.domain}:${location.port}${socket_namespace}`);

    socket.on('connect', () => console.log('Socket connected'));

    socket.on('disconnect', why => console.log(`Socket disconnected: ${why}`));

    socket.on('audio_upload_ok', () => console.log('Audio uploaded'));

    socket.on('spectrogram', msg => {
        var data = JSON.parse(msg.spectrogram);
        make_spectrogram(mixture_spectrogram_heatmap, data, mixture_waveform.surfer.backend.getDuration());
    });

    socket.on('spectrogram_image_ready', msg => {
        getSpectrogramAsImage(mixture_spectrogram_heatmap, msg.max_freq);
    });

    socket.on('binned_embeddings', msg => {
        let indices = JSON.parse(msg);

        dcPCA.addTFIndices(indices);
        let hist = pcaMatrixToHistogram(dcPCA.TFIndices);

        // pca of size 100 x 100
        make_pca(dcPCA, hist, 100, 100);
        dcBar.addTFIndices(indices);
        dcBar.initBar(pcaMatrixToBar(dcPCA.TFIndices));

        dcSpectrogram.setLoading(false);
        dcBar.linkedSpec.setLoading(false);
    });

    socket.on('pca_explained_variance', msg => {
        // executes passed in function with `_this` as
        // the calling object (pcaSelectionModal)
        pcaSelectionModal._addArbitraryFunction(setupPlotly,
            ['pca-dimensions', JSON.parse(msg)]);

        document.getElementById('pca-selection-modal-open').classList.remove('disabled');
    });

    socket.on('mel', msg => {
        let spec_data = JSON.parse(msg);
        dcSpectrogram.dims = [spec_data.length, spec_data[0].length];
        dcBar.linkedSpec.dims = [spec_data.length, spec_data[0].length];

        // currently hardcoding in max mel freq
        let durationInSecs = mixture_waveform.surfer.backend.getDuration();
        getMelScatterSpectrogramAsImage(dcSpectrogram, dcSpectrogram.dims[1], durationInSecs, 150);
        getMelScatterSpectrogramAsImage(dcBar.linkedSpec, dcBar.linkedSpec.dims[1],
            durationInSecs, 150);
    });

    socket.on('bad_file', () => console.log('File rejected by server'));

    socket.on('envelope_data', msg => addEnvelopeData(msg.envelopeData, msg.algorithm));

    socket.on('masked_audio', _ => {
        let url = `./get_masked_audio?val=${Math.random().toString(36).substring(7)}`;
        let num = selectionCounter.toString();
        addTrack('dc-selected-' + num, 'Selected Cluster #' + num, url, 'RebeccaPurple');

        if(bothSelected)
            $('#see-results').removeClass('disabled');
        else
            bothSelected = true;
    });

    socket.on('inverse_audio', _ => {
        let url = `./get_inverse_audio?val=${Math.random().toString(36).substring(7)}`;
        let num = selectionCounter.toString();
        addTrack('dc-unselected-' + num, 'Unselected Cluster #' + num, url, 'HotPink');

        if(bothSelected)
            $('#see-results').removeClass('disabled');
        else
            bothSelected = true;
    });
});

function relayoutPlots() {
    resizeToContainer(dcPCA);
    resizeToContainer(dcSpectrogram);
    resizeToContainer(mixture_spectrogram_heatmap);
    resizeToContainer(dcBar);
    document.getElementById('pca-dimensions').layout !== undefined &&
        Plotly.relayout('pca-dimensions', { width: $('#pca-selection-modal-plot-wrapper').width() });
}

// RESIZE ON TAB CHANGE
// TODO: fix hacky implementation
$('.nav-link').on('click', () => { setTimeout(relayoutPlots, 180); });

$('#see-results').on('click', () => {
    $('#deep-clustering-tab').removeClass('active').removeClass('show');
    $('#deep-clustering-tab-bootstrap').removeClass('active').removeClass('show');

    $('#reqs-tab').addClass('active').addClass('show');
    $('#reqs-tab-bootstrap').addClass('active').addClass('show');
});

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
        ++selectionCounter;
        socket.emit('mask', { mask: dcSpectrogram.exportSelectionMask() });
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

$('#pca-selection-modal-begin').click(() => {
    if(!$('#pca-selection-modal-begin').hasClass('disabled')) {
        let dims = pcaSelectionModal.layout.shapes.map(shape => Math.floor(shape.x1));
        socket.emit('set_pca_dims', { dims: dims });

        pcaSelectionModal.hide();

        $('.shared-plots-spinner').hide();
        $('#plots-spinner').show();
        $('#plots-spinner').css('display', 'flex');
        dcPCA.plotLayout.xaxis.title = `Principal Component ${dims[0]}`;
        dcPCA.plotLayout.yaxis.title = `Principal Component ${dims[1]}`;
        dcPCA.clearSelections();
    }
});
