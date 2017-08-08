var repet_worker;
var mixture_waveform = Object.create(WaveSurfer);
var all_waveforms = [mixture_waveform];
var beat_spectrum_loaded = false;
var plt = Bokeh.Plotting;

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

Array.prototype.max = function () {
    return Math.max.apply(Math, this);
};

Array.prototype.min = function () {
    return Math.min.apply(Math, this);
};

$(document).ready(function() {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	online = new AudioContext();

	context = online;

    // if (typeof(Worker) !== "undefined") {
    //     if (typeof(repet_worker) === "undefined") {
    //         repet_worker = new Worker('repet.js');
    //     }
    // } else {
    //     // browser too old
    //     // handle no worker case
    // }


});

document.addEventListener('DOMContentLoaded', function () {

    var options = {
        container: document.querySelector('#waveform'),
        waveColor: 'blue',
        progressColor: 'navy',
        cursorColor: 'black',
        scrollParent: true,
        height: 120,
        normalize: true,
        //backend: 'MediaElement'
        audioRate: 1.0

    };

    // Init mixture_waveform
    mixture_waveform.init(options);
    mixture_waveform.enableDragSelection({
        color: green
    });
});

$("#volume").slider({
    min: 0,
    max: 100,
    value: 50,
    range: "min",
    slide: function(event, ui) {
        setMixtureVolume(ui.value / 100);
    }
});

function sendDataBack() {
    var toy_start = $('#selection_start').val();
    var toy_end = $('#selection_end').val();
    $.ajax({
        url: '/get_beat_spectrum?start=' + toy_start + '&end=' + toy_end,
        dataType: 'json',
        method: 'GET'
    }).done(function (posts) {
        var beat_spectrum_data = posts.beat_spectrum_data;
        var entropy = posts.entropy;
        var log_mean = posts.log_mean;
        var start_time = posts.start;
        var end_time = posts.end;
        bokeh_beat_spectrum(beat_spectrum_data, start_time, end_time);
        $('#beat_spectrum_entropy').append(entropy);
        $('#beat_spcetrum_log_mean').append(log_mean);
//        ClearBeatSpectrum();
//        PlotBeatSpectrum(beat_spectrum_data);
    });
}

function getSpectrogramJson() {
    var channel = $('#channel').val();
    $.ajax({
        url: '/get_spectrogram?channel=' + channel,
        dataType: 'json',
        method: 'GET'
    }).done(function (posts) {
        var spectrogram_data = posts.power_spectrogram_data;
        var end_time = posts.signal_duration;
        var max_freq = posts.max_frequency;
        bokeh_spectrogram(spectrogram_data, 0.0, end_time, max_freq);
    });
}

function getSpectrogram() {
    var channel = $('#channel').val();
    var url = window.location.origin + '/get_spectrogram?channel=' + channel;
    $('#spectrogram_bokeh').html('<iframe src="' + url + '" width="1000px" height="600px" ' +
        'style="overflow:auto;"/>');
}

function getBeatSpectrum() {
    var toy_start = $('#selection_start').val();
    var toy_end = $('#selection_end').val();
    var url = window.location.origin + '/get_beat_spectrum?start=' + toy_start + '&end=' + toy_end;
    $('#beat_spectrum_container_bokeh').html('<iframe src="' + url + '" width="1000px" height="600px" ' +
        'style="overflow:auto;"/>');
    
}

function run_repet() {
    repet_worker.postMessage({'cmd': 'start', 'file' : '' });

}

function terminate_repet() {
    repet_worker.terminate();
}



