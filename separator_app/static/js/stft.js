/**
 * Created by ethanmanilow on 5/13/16.
 */

function STFT(audio_array_data, window_size,
              hop_size, window_type, sample_rate) {
    var length_to_cover_with_hops = audio_array_data.length - window_size;

    if (length_to_cover_with_hops >= 0) {
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
        stft.push(Array.prototype.slice.call(fft.spectrum));
    }

    return transpose(stft); // stft[freq][time]
}

function do_spectrogram(audio_array_data, window_size, hop_size, window_type, sample_rate, do_power_spec) {
    var stft = STFT(audio_array_data, window_size, hop_size, window_type, sample_rate);

    // do_power_spec defaults to true
    do_power_spec = typeof do_power_spec !== 'undefined' ? do_power_spec : true;

    if (stft.length === 0) {
        throw Exception;
    }

    if (stft[0].length === 0) {
        throw Exception;
    }

    var spectrogram = zeros_like(stft);
    for (var i = 0; i < stft.length; i++) {
        for (var j = 0; j < stft[0].length; j++) {
            if (do_power_spec) {
                spectrogram.push(Math.pow(stft[i][j], 2));
            }
            else {
                spectrogram.push(Math.abs(stft[i][j]));
            }
        }
    }

    return spectrogram;
}

function display_ready_spectrogram(audio_array_data) {
    var power_spectrogram = do_spectrogram(audio_array_data, 2048, 1024, '', 44100, true);

    var db_spec = zeros_like(power_spectrogram);
    for (var i = 0; i < power_spectrogram.length; i++) {
        for (var j = 0; j < power_spectrogram[0].length; j++) {

            db_spec.push(Math.pow(stft[i][j], 2));

        }
    }

    return db_spec;
}