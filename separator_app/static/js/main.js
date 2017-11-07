var InteractiveAudioLab = namespace('InteractiveAudioLab');
var WebUnmixingToolbox = namespace('InteractiveAudioLab.WebUnmixingToolbox');
var Main = namespace('InteractiveAudioLab.WebUnmixingToolbox.Main');

var mixture_waveform = Object.create(WaveSurfer);
var result_waveform = Object.create(WaveSurfer);
var all_waveforms = [mixture_waveform, result_waveform];
var defaultZoomStart;
var zoomStepSize = 5;
// var mixture_spectrogram = {rawData: null, plot: null, xTicks: null, yTicks: null, selectedArray: null};
var mixture_spectrogram_heatmap = new SpectrogramHeatmap('spectrogram-heatmap', 20000);
var result_spectrogram_heatmap = new SpectrogramHeatmap('result-spectrogram-heatmap', 20000);
var ft2d_heatmap = new FT2DHeatmap('ft2d-heatmap', 1.0);
var duet_histogram = new AttenuationDelayHistogram('duet-heatmap', 0.0);
// var mixture_2dft = {rawData: null, plot: null, xTicks: null, yTicks: null};

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

var duet_color = pink;
var ft2d_color = yellow;

$(document).ready(function() {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	online = new AudioContext();

	context = online;
//	make_spectrogram('heatmap');

    $("#mainTabs").find("a").click(function(e){
        e.preventDefault();
        $(this).tab('show');
    });
});


document.addEventListener('DOMContentLoaded', function () {

    var mixtureOptions = {
        container: document.querySelector('#mixture-waveform'),
        waveColor: 'blue',
        progressColor: 'navy',
        cursorColor: 'black',
        scrollParent: false,
        height: 120,
        normalize: true,
        //backend: 'MediaElement'
        audioRate: 1.0
//        splitChannels: true
    };

    // Init mixture_waveform
    mixture_waveform.init(mixtureOptions);
    // mixture_waveform.enableDragSelection({
    //     color: green,
    //     resize: true
    // });
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


    //  ~~~~~~~~~~~~~   MODAL STUFF   ~~~~~~~~~~~~~~~~


    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });

    $('#mixture-contains').multiselect({
        enableCollapsibleOptGroups: true,
        buttonContainer: '<div id="mixture-contains-container" />',
        maxHeight: 300,
        buttonWidth: '300px',
        enableFiltering: false,
        onChange: function(element, checked) {
            if (checked === true) {
                $('#extraction-goal').append('<option value="' + element.val() + '">'
                    + element.context.label + '</option>')
            }
            else if (checked === false) {
                $('option[value="' + element.val() + '"]', $('#extraction-goal')).remove();
            }
            $('#extraction-goal').multiselect('rebuild');

            enableSurveyDoneButton();
        }
    });

    // Collapse all groups in mixture-contains dropdown by default
    $('#mixture-contains-container ul.multiselect-container li:not(.multiselect-all):not(.multiselect-group)')
        .hide()
        .addClass('multiselect-collapsible-hidden');

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
    $('#mixture-contains').multiselect('disable');
    $('#extraction-goal').multiselect('disable');
    $('[data-toggle="popover"]').popover();

});

function enableSurveyDoneButton() {
    if ($('#extraction-goal option:selected').length > 0
        && $('#mixture-contains option:selected').length > 0) {
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
});

result_waveform.on('ready', function () {
  var timeline = Object.create(WaveSurfer.Timeline);

  timeline.init({
    wavesurfer: result_waveform,
    container: '#result-waveform-timeline'
  });
});


// $("#title-text")
// .mouseenter(function() {
//     var el = $(this);
//     el.data("text-original", el.text());
//     el.text(el.data("text-swap"));
// })
// .mouseleave(function() {
//     var el = $(this);
//     el.text(el.data("text-original"));
// });


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
    $('#mixture-contains').multiselect('deselectAll', false);
    // $('#mixture-contains-container .caret-container').click();
    audio.import_audio();
    $('#general-status').text('Uploading audio to server...');
}

$('#open-modal').on('shown.bs.modal', function(){
    // $('#mixture-contains-container .caret-container').click();
});

$('#survey-done').click(function () {
    sendSurveyResults();
});

function sendSurveyResults() {
    let mixture_contains = $('#mixture-contains option:selected').map(function() {
        return $(this).val();
    }).get();

    let extraction_goals = $('#extraction-goal option:selected').map(function() {
        return $(this).val();
    }).get();

    let do_not_store = $('#do-not-store').is(':checked');

    let survey_data = {
        mixture_contains: mixture_contains,
        extraction_goals: extraction_goals,
        do_not_store: do_not_store
    };

    let url = "/survey_results?val=" + Math.random().toString(36).substring(7);
    // $.post(url, JSON.stringify({survey_data: survey_data}), 'json');
    $.ajax({
            type: "POST",
            url: url,
            contentType: 'application/json',
            dataType: 'json',
            cache: false,
            data: JSON.stringify({survey_data: survey_data})
        })
}

function getSpectrogram() {
    /*
    Gets spectrogram data from server using an ajax request.
    First has to check to see if there are any regions, if so only gets spectrogram in that region.
    */

    var url = "/get_spectrogram?val=" + Math.random().toString(36).substring(7);
    var audioLength = mixture_waveform.backend.getDuration();

    make_spectrogram(mixture_spectrogram_heatmap, url, audioLength);

}

function get2DFT() {
    var url = "/get_2dft?val=" + Math.random().toString(36).substring(7);
    make_2dft(url);
}

function getAtnDelayHist() {
    var url = "/get_atn_delay_hist?val=" + Math.random().toString(36).substring(7);
    make_atn_delay_hist(url);
}

function getReqs() {
    var url = "/reqs?val=" + Math.random().toString(36).substring(7);
    $.get(url, function( data ) {
        let resp = JSON.parse(data);
        for (var i = 0; i < resp.length; ++i) {
            let current_req = resp[i];

            mixture_waveform.addRegion({
                id: current_req.type + '_' +  i,
                start: resp[i].time.start,
                end: resp[i].time.end,
                color: current_req.type === 'duet' ? duet_color : ft2d_color,
                drag: false,
                resize: false
            });
        }
    });
}