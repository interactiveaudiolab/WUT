var InteractiveAudioLab = namespace('InteractiveAudioLab');
var WebUnmixingToolbox = namespace('InteractiveAudioLab.WebUnmixingToolbox');
var Main = namespace('InteractiveAudioLab.WebUnmixingToolbox.Main');

var mixture_waveform = Object.create(WaveSurfer);
var result_waveform = Object.create(WaveSurfer);
var all_waveforms = [mixture_waveform, result_waveform];
var defaultZoomStart;
var zoomStepSize = 5;
var mixture_spectrogram = {rawData: null, plot: null, xTicks: null, yTicks: null};
var mixture_2dft = {rawData: null, plot: null, xTicks: null, yTicks: null};

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

$(document).ready(function() {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	online = new AudioContext();

	context = online;
//	make_spectrogram('heatmap');

    $("#mainTabs a").click(function(e){
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
    mixture_waveform.enableDragSelection({
        color: green,
        resize: true
    });
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

    emptyHeatmap('spectrogram-heatmap');
    emptyHeatmap('ft2d-heatmap');
});

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

$("#volume-slider").slider({
//$("#ex4").slider({
    reversed: true,
    min: 0,
    max: 100,
    value: 50,
    range: "min",
    slide: function(event, ui) {
        setMixtureVolume(ui.value / 100);
    }
});


$("#title-text")
.mouseenter(function() {
    var el = $(this);
    el.data("text-original", el.text());
    el.text(el.data("text-swap"));
})
.mouseleave(function() {
    var el = $(this);
    el.text(el.data("text-original"));
});


$('#mixture-zoom-in').click(function(){
    mixture_waveform.zoom(mixture_waveform.params.minPxPerSec + zoomStepSize);
});

$('#mixture-zoom-out').click(function(){
    mixture_waveform.zoom(mixture_waveform.params.minPxPerSec - zoomStepSize);
});

mixture_waveform.on('region-created', function() {
    if (numberOfRegions() > 0) {
        prevRegion = getFirstObject(mixture_waveform.regions.list);
        prevRegion.remove();
    }

});

$("#get-spectrogram").click(function() {
    getSpectrogram();

});

$('#save-result').click(function() {
    if (!result_waveform.backend.buffer) {
        return;
    }

    let blob = bufferToWave(result_waveform.backend.buffer, 0.0, result_waveform.backend.buffer.length);
    saveAs(blob, 'wut_result.wav', false);
});


function enableSpecTools(enabled) {
    if (enabled === true) {
        $('.spec-tool').removeClass('disabled');
    }
    else if (enabled === false) {
        $('.spec-tool').addClass('disabled');
    }
}

function enableResultControls(enabled) {
    if (enabled === true) {
        $('.result-controls').removeClass('disabled');
    }
    else if (enabled === false) {
        $('.result-controls').addClass('disabled');
    }
}

$('#results-pill').click(function() {
    $(this).removeClass('result-ready');
});

function getSpectrogram() {
    /*
    Gets spectrogram data from server using an ajax request.
    First has to check to see if there are any regions, if so only gets spectrogram in that region.
    */

    if (numberOfRegions() > 1) {
        console.log('Uh oh!!! More than one region!!!');
    }

    var url = "/get_spectrogram?val=" + Math.random().toString(36).substring(7);
    var specLength = mixture_waveform.backend.getDuration();
    var selectedRange = [0.0, specLength];


    if (numberOfRegions() === 1) {
        selectedRegion = getFirstObject(mixture_waveform.regions.list);
        selectedRange = [selectedRegion.start, selectedRegion.end];
        // var start = truncateFloat(selectedRegion.start);
        // var stop =  truncateFloat(selectedRegion.end);
        // url += '?start=' + start + '&stop=' + stop;
        // specLength = stop - start;
        // audioOffset = start;
    }

    make_spectrogram("spectrogram-heatmap", url, specLength, selectedRange);

};

function get2DFT() {
    var url = "/get_2dft?val=" + Math.random().toString(36).substring(7);
    make_2dft("ft2d-heatmap", url);
}
