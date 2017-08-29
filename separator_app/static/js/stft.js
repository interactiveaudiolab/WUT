/**
 * Created by ethanmanilow on 5/13/16.
 */

function STFT(audio_array_data, window_size,
              hop_size, window_type, sample_rate) {
    var length_to_cover_with_hops = audio_array_data.length - window_size;

    if (length_to_cover_with_hops < 0) {
        Error("window_size cannot be longer than the signal to be windowed");
    }

    var n_hops = 1 + Math.floor(length_to_cover_with_hops / hop_size);

    // TODO: use window_type
    var window_func = new WindowFunction(DSP.HANN);
    var fft = new FFT(window_size, sample_rate);

    var stft = [];
    for (var hop = 0; hop < n_hops; hop++) {
        var start = hop * hop_size;
        var end = start + window_size;
        var unwindowed_sound = audio_array_data.slice(start, end);
        var windowed_sound = window_func.process(unwindowed_sound);

        fft.forward(windowed_sound);
        let real = squareTypedArray(fft.real.subarray(0, window_size / 2));
        let imag = squareTypedArray(fft.imag.subarray(0, window_size / 2));
        let pow = add_arrays(real, imag);
        stft.push(Array.prototype.slice.call(pow));
    }

    return {spec: transpose(stft), fft: fft}; // stft[freq][time]
}

function display_ready_spectrogram(audio_array_data, window_size, hop_size, window_type, sample_rate) {
    var spec = STFT(audio_array_data, window_size, hop_size, window_type, sample_rate);
    var fft = spec.fft;
    spec = spec.spec;

    // do_power_spec defaults to true
    // do_power_spec = typeof do_power_spec !== 'undefined' ? do_power_spec : true;

    if (spec.length === 0) {
        throw Exception;
    }

    if (spec[0].length === 0) {
        throw Exception;
    }

    var reference_value = minMax2D(spec).max;
    var min_val = 1e-10;
    var ref = 10 * Math.log10(Math.max(min_val, reference_value));

    // var sums = [];
    var spectrogram = zeros_like(spec);
    for (var i = 0; i < spec.length; i++) {
        for (var j = 0; j < spec[0].length; j++) {

            let val = spec[i][j] > min_val ? spec[i][j] : min_val;
            val = 10 * Math.log10(val) - ref;

            spectrogram[i][j] = val;

        }
        // sums.push(spectrogram[i].reduce(function(a, b) { return a + b + 280; }, 0));
    }
    // var der = mvg_avg_derivative(sums, 5);
    // var idx = der.indexOf(Math.min(...der)) + 5;
    // var top_band = fft.getBandFrequency(idx);
    //
    // spectrogram = transpose(spectrogram);
    // for (i = 0; i < spec.length; i++) {
    //     spectrogram[i] = spectrogram[i].slice(0, idx);
    // }
    // spectrogram = transpose(spectrogram);

    return {spectrogram: spectrogram, freqMax: fft.peak * sample_rate};
}

// function display_ready_spectrogram(audio_array_data) {
//     var power_spectrogram = do_spectrogram(audio_array_data, 2048, 1024, '', 44100, true);
//
//     var db_spec = zeros_like(power_spectrogram);
//     for (var i = 0; i < power_spectrogram.length; i++) {
//         for (var j = 0; j < power_spectrogram[0].length; j++) {
//
//             db_spec.push(Math.pow(stft[i][j], 2));
//
//         }
//     }
//
//     return db_spec;
// }