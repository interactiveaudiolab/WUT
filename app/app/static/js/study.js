var mixture_waveform = new Waveform(
    '#mixture-waveform',
    '#mixture-play',
    '#mixture-stop'
);
var masked_waveform = new Waveform(
    '#masked-waveform',
    '#masked-play',
    '#masked-stop',
    '#masked-spinner'
);
var inverse_waveform = new Waveform(
    '#inverse-waveform',
    '#inverse-play',
    '#inverse-stop',
    '#inverse-spinner'
);

var all_waveforms = [mixture_waveform, masked_waveform, inverse_waveform];
var dcBar = new DC1DBar(
    'pca-1d',
    'slider-1d',
    'spectrogram',
    {
        className: 'dc-1d-control',
        flipID: 'flip-1d',
        logYCheck: 'log-y-1d',
        applyID: 'apply-dc-selections-1d',
        seeResultsID: 'see-results-1d',
    },
);
var socket;

var colorDict = {
    white: {
        line: 'rgba(245, 245, 245, 1)',
        fill: 'rgba(255, 255, 255, 0.35)',
    },
    green: {
        line: 'rgba(0, 255, 0, 1)',
        fill: 'rgba(0, 255, 0, 0.35)',
    },
};

$(document).ready(function() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();

    socket_namespace = '/wut';
    socket = io.connect(
        `${location.protocol}//${document.domain}:${location.port}${socket_namespace}`
    );

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', why => console.log(`Socket disconnected: ${why}`));
    socket.on('audio_upload_ok', () => console.log('Audio uploaded'));
    socket.on('bad_file', () => console.log('File rejected by server'));

    socket.on('binned_embeddings', function(msg) {
        // square indices matrix where each coordinate keys to a list of
        // TF spectrogram indices that correspond to that PCA bin
        dcBar.initBar(JSON.parse(msg));
        dcBar.linkedSpec.setLoading(false);
    });

    socket.on('spectrogram', msg => {
        console.log('Retrieving spectrogram.');
        const spec_data = JSON.parse(msg);
        dcBar.linkedSpec.dims = [spec_data.length, spec_data[0].length];

        // currently hardcoding in max mel freq
        getSpectrogramAsImage(
            dcBar.linkedSpec,
            dcBar.linkedSpec.dims[1],
            mixture_waveform.surfer.backend.getDuration(),
            // TODO: get actual max frequency here
            129,
        );
    });

    socket.on('masked_audio', function(message) {
        masked_waveform.load(
            `./get_masked_audio?val=${Math.random().toString(36).substring(7)}`
        );
    });

    socket.on('inverse_audio', function(message) {
        inverse_waveform.load(
            `./get_inverse_audio?val=${Math.random().toString(36).substring(7)}`
        );
    });
});

document.addEventListener('DOMContentLoaded', function () {
    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
});


function relayoutPlots() {
    Plotly.relayout(dcBar.divID, {
        width: dcBar.DOMObject.width(),
    });
    Plotly.relayout(dcBar.linkedSpec.divID, {
        width: dcBar.linkedSpec.DOMObject.width(),
    });
}

// resize plots on window change
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

//  ~~~~~~~~~~~~~ Apply Selections button ~~~~~~~~~~~~~

$('#apply-selections').click(function(){
    // probably a better way to check this in the future
    if(!$('#apply-selections').hasClass('disabled')) {
        masked_waveform.setLoading(true);
        inverse_waveform.setLoading(true);

        socket.emit('mask', { mask: dcBar.linkedSpec.exportSelectionMask() });
    }
});
