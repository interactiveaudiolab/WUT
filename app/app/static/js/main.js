var InteractiveAudioLab = namespace('InteractiveAudioLab');
var WebUnmixingToolbox = namespace('InteractiveAudioLab.WebUnmixingToolbox');
var Main = namespace('InteractiveAudioLab.WebUnmixingToolbox.Main');

var mixture_waveform = Object.create(WaveSurfer);
var result_waveform = Object.create(WaveSurfer);
var all_waveforms = [mixture_waveform, result_waveform];
var defaultZoomStart;
var zoomStepSize = 5;
var mixture_spectrogram_heatmap = new SpectrogramHeatmap('spectrogram-heatmap', 20000);
var result_spectrogram_heatmap = new SpectrogramHeatmap('result-spectrogram-heatmap', 20000);
// var ft2d_heatmap = new FT2DHeatmap('ft2d-heatmap', 1.0);
var duet_histogram = new AttenuationDelayHistogram('duet-heatmap', 0.0);

var socket;
var time_to_graph = 0.0;
var loader;

//Colors
var red = 'rgba(255, 0, 0, 0.5)';
var blue = 'rgba(0, 0, 255, 0.5)';
var green = 'rgba(0, 255, 0, 0.3)';
var purple = 'rgba(128, 0, 128, 0.3)';
var orange = 'rgba(255, 165, 0, 0.3)';
var pink = 'rgba(255, 0, 255, 0.3)';
var yellow = 'rgba(255, 255, 0, 0.3)';
var lightBlue = 'rgba(0, 255, 255, 0.3)';
var forestGreen = 'rgba(34, 139, 34, 0.3)';
var aquamarine = 'rgba(127, 255, 212, 0.3)';
var burntSienna = 'rgba(138, 54, 12, 0.3)';
var lightGreen = 'rgba(102, 255, 178, 0.3)';
var gray = 'rgba(100, 100, 100, 0.3)';

var whiteLine = 'rgba(245, 245, 245, 1)';
var whiteFill = 'rgba(255, 255, 255, 0.35)';
var greenLine = 'rgba(0, 255, 0, 1)';
var greenFill = 'rgba(0, 255, 0, 0.35)';

var colorDict = {'white': {'line': whiteLine, 'fill': whiteFill },
                 'green': {'line': greenLine, 'fill': greenFill } };

var duet_color = pink;
var ft2d_color = yellow;
var spec_as_image = false;

$(document).ready(function() {
	loader = new wavesLoaders.AudioBufferLoader();

    $("#mainTabs").find("a").click(function(e){
        e.preventDefault();
        $(this).tab('show');
    });

    // Set up sockets

    socket_namespace = '/wut';
    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + socket_namespace);

    socket.on('connect', function() {
        console.log('Socket connected.');
    });

    socket.on('disconnect', function (reason) {
        console.log('Socket disconnected: ' + reason)
    });

    socket.on('audio_upload_ok', function () {
        console.log('Audio uploaded to server.');
        $('#general-status').text('Audio uploaded to server.');
        initMultiTrack();
    });

    socket.on('spectrogram', function (message) {
        var data = JSON.parse(message.spectrogram);
        make_spectrogram(mixture_spectrogram_heatmap, data, mixture_waveform.backend.getDuration());
    });

    socket.on('spectrogram_image_ready', function (message) {
        getSpectrogramAsImage(mixture_spectrogram_heatmap, message.max_freq);
    });

    socket.on('ft2d', function(message) {
        var data = JSON.parse(message.ft2d);
        make_2dft(data);
    });

    socket.on('ad_hist', function(message) {
        var data = JSON.parse(message.ad_hist);
        make_atn_delay_hist(data);
    });

    socket.on('bad_file', function () {
        console.log('File rejected by server');
    });

    socket.on('envelope_data', function (message) {
        addEnvelopeData(message.envelopeData, message.algorithm);
    });
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
        audioRate: 1.0,
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

    // result_waveform.init(resultOptions);


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
        onChange: function(element, checked) {
            enableSurveyDoneButton();
        }
    });

    $("#survey :input").prop('readonly', true);
    $('#extraction-goal').multiselect('disable');
    $('[data-toggle="popover"]').popover();

});

function enableSurveyDoneButton() {
    if ($('#extraction-goal option:selected').length > 0) {
        $('#survey-done').removeClass('disabled');
    } else {
        $('#survey-done').addClass('disabled');
    }
}

mixture_waveform.on('ready', function () {
  var timeline = Object.create(WaveSurfer.Timeline);

  timeline.init({
    wavesurfer: mixture_waveform,
    container: '#waveform-timeline'
  });

  emptyMultiTrack();
});

result_waveform.on('ready', function () {
  var timeline = Object.create(WaveSurfer.Timeline);

  timeline.init({
    wavesurfer: result_waveform,
    container: '#result-waveform-timeline'
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


$('#save-result').click(function() {
    if (!result_waveform.backend.buffer) {
        return;
    }

    let blob = bufferToWave(result_waveform.backend.buffer, 0.0, result_waveform.backend.buffer.length);
    saveAs(blob, 'wut_result.wav', false);
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
    result_waveform.drawBuffer();
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

    let survey_data = {
        extraction_goals: extraction_goals,
        // do_not_store: do_not_store
    };

    socket.emit('survey_results', survey_data);

}
