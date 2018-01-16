
self.addEventListener('message', function (e) {
    var data = e.data;
    switch (data.cmd) {
        case 'start':
            self.postMessage('REPET started');
            do_run_repet();
            break;
        case 'stop':
            self.postMessage('REPET stopped');
            break;
        default:
            break;
    }
});

var beat_spectrum = {};

beat_spectrum.compute = function() {
    var audio_data = get_audio_data();
    if (audio_data == -1) {
        // TODO: error message here
        return;
    }
    var audio_array_data = audio_data[0];

    var window_size = 2048, hop_size = window_size / 2, sample_rate = audio_data[1];
    var spectrogram_data = STFT(audio_array_data, window_size, hop_size, '', sample_rate);
    // show_spectrogram(JSON.stringify(spectrogram_data));
    show_spectrogram_plotly(spectrogram_data);

    var start = 0;
    var end = audio_array_data.length;
    var ten_seconds_index = 10.0 * sample_rate;
    if (end > ten_seconds_index) {
        end = audio_array_data.splice(0, end);
    }

    var b = compute_beat_spectrum(spectrogram_data, sample_rate, start, end);
    show_beat_spectrum_plotly(b);

};

beat_spectrum.plot = function () {

};

function do_run_repet() {
    beat_spectrum.compute();
}

function compute_beat_spectrum(stft, sample_rate, start, end) {

    var n_time_bins = stft[0].length;

    // twice stft length, but then we need to go to the next highest power of 2
    // because DSP.js FFT can only work on powers of 2
    var freq_bins = Math.pow(2, Math.ceil(Math.log(n_time_bins * 2)/Math.log(2)));

    var auto_correlation = zeros(stft.length, freq_bins);
    auto_correlation = add_matrix(auto_correlation, stft);
    var fft_of_stft = [];
    var fft = new FFT(auto_correlation[0].length, sample_rate);

    // Do fft of each freq slice
    for (var fr = 0; fr < stft.length; fr++) {
        fft.forward(auto_correlation[fr]);
        fft_of_stft.push(fft.real);
    }

    var fft_sq = math.square(fft_of_stft); // square each element

    // take the ifft of the squared fft matrix
    var inv_fft_sq = [];
    for (fr = 0; fr < fft_sq.length; fr++) {
        fft.inverse(fft_sq[fr]);
        inv_fft_sq.push(fft.real.slice(0, n_time_bins));
    }

    // normalization
    var norm = reverse_range(1, n_time_bins);
    var r = zeros_like(stft);
    for (fr = 0; fr < fft_sq.length; fr++) {
        for (var t = 0; t < n_time_bins; t++) {
            r[fr][t] = inv_fft_sq[fr][t] / norm[t];
        }
    }

    var result = [];
    var avg;
    // take average over frequencies
    for (t = 0; t < n_time_bins; t++) {
        avg = 0.0;
        for (fr = 0; fr < fft_sq.length; fr++) {
            avg += r[fr][t];
        }
        avg /= fft_sq.length;
        result.push(avg);
    }

    return result;

}

