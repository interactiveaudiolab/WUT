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
