var mixture_waveform = new Waveform('#mixture-waveform', '#mixture-play', '#mixture-stop')
var all_waveforms = [mixture_waveform];
var zoomStepSize = 5;
var mixture_spectrogram_heatmap = new SpectrogramHeatmap('spectrogram', 20000);

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

    $("#mainTabs").find("a").click(function(e){
        e.preventDefault();
        $(this).tab('show');
    });

    // Set up sockets

    socket_namespace = '/wut';
    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + socket_namespace);

    socket.on('connect', () => console.log('Socket connected'));

    socket.on('disconnect', (reason) => console.log(`Socket disconnected: ${reason}`));

    socket.on('audio_upload_ok', function () {
        console.log('Audio uploaded to server.');
        $('#general-status').text('Audio uploaded to server.');
        initMultiTrack();
    });

    socket.on('spectrogram', (msg) => {
        var data = JSON.parse(msg.spectrogram);
        make_spectrogram(mixture_spectrogram_heatmap, data, mixture_waveform.surfer.backend.getDuration());
    });

    socket.on('spectrogram_image_ready', (msg) => {
        console.log('Spectrogram image ready!')
        getSpectrogramAsImage(mixture_spectrogram_heatmap, msg.max_freq);
    });

    socket.on('ft2d', (msg) => make_2dft(JSON.parse(msg.ft2d)));

    socket.on('ad_hist', (msg) => make_atn_delay_hist(JSON.parse(msg.ad_hist)));

    socket.on('bad_file', () => console.log('File rejected by server'));

    socket.on('envelope_data', (msg) => {
        addEnvelopeData(msg.envelopeData, msg.algorithm);
    });
});

document.addEventListener('DOMContentLoaded', function () {
    //  ~~~~~~~~~~~~~   MODAL STUFF   ~~~~~~~~~~~~~~~~
    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });

    $('#extraction-goal').multiselect({
        enableCollapsibleOptGroups: true,
        maxHeight: 300,
        buttonWidth: '300px',
        enableFiltering: false,
        onChange: function(element, checked) { enableSurveyDoneButton(); }
    });

    $("#survey :input").prop('readonly', true);
    $('#extraction-goal').multiselect('disable');
    $('[data-toggle="popover"]').popover();
});

function enableSurveyDoneButton() {
    maybeEnable('#survey-done', $('#extraction-goal option:selected').length > 0);
}

function maybeEnable(cssIdentifier, cond) {
    cond ? $(cssIdentifier).removeClass('disabled')
         : $(cssIdentifier).addClass('disabled');
}

mixture_waveform.surfer.on('ready', function() { emptyMultiTrack(); });

$('#privacy-policy-link').click(function(){
    $('#privacy-modal').modal({ backdrop: 'static' });
});

$('#mixture-zoom-in').click(function(){
    mixture_waveform.zoom(mixture_waveform.params.minPxPerSec + zoomStepSize);
});

$('#mixture-zoom-out').click(function(){
    mixture_waveform.zoom(mixture_waveform.params.minPxPerSec - zoomStepSize);
});

$('#save-result').click(function() {
    if (!result_waveform.backend.buffer) return;

    let blob = bufferToWave(result_waveform.backend.buffer, 0.0, result_waveform.backend.buffer.length);
    saveAs(blob, 'wut_result.wav', false);
});

function enableTools(enabled, className) { maybeEnable(enabled, className) }

$('#results-pill').click(function() {
    $(this).removeClass('result-ready');
    result_waveform.drawBuffer();
});

$('#import-audio').click(function(){
    $('#open-modal').modal({ backdrop: 'static', keyboard: false });
    openFileDialog();
});

$('#open-button-modal').click(function () { openFileDialog(); });

function openFileDialog() {
    $('#survey')[0].reset();
    $('#extraction-goal').multiselect('deselectAll', false);
    audio.import_audio();
    $('#general-status').text('Uploading audio to server...');
}

$('#survey-done').click(function () {
    if (!$(this).hasClass('disabled')) {
        $('#open-modal').modal('toggle');
        sendSurveyResults();
    }
});

function sendSurveyResults() {
    let extraction_goals = $('#extraction-goal').find('option:selected').map(function() {
        return $(this).val();
    }).get();

    let survey_data = { extraction_goals: extraction_goals };
    socket.emit('survey_results', survey_data);
}
