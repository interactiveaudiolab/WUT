from __future__ import division

import nussl
import numpy as np
import librosa
import matplotlib.pyplot as plt
from math import tanh
import bottleneck as bn


def main():
    song = 'layered_song2'
    path = song + '.wav'
    sig = nussl.AudioSignal(path)
    sig.to_mono(overwrite=True)
    stft = sig.stft()
    # sig.plot_spectrogram(song + 'spec')
    ps = np.array(librosa.logamplitude(np.abs(stft) ** 2, ref_power=np.max), dtype='int8') + 80
    harm, perc = librosa.decompose.hpss(stft[:, :, 0])
    # harm1, harm2 = librosa.decompose.hpss(harm)

    # h = nussl.AudioSignal(stft=np.expand_dims(harm, 2))
    # h.istft()
    # h.write_audio_to_file(song + '_harm.wav')
    # p = nussl.AudioSignal(stft=np.expand_dims(perc, 2))
    # p.istft()
    # p.write_audio_to_file(song + '_perc.wav')
    # h = nussl.AudioSignal(stft=np.expand_dims(harm1, 2))
    # h.istft()
    # h.write_audio_to_file(song + '_harm1.wav')
    # p = nussl.AudioSignal(stft=np.expand_dims(harm2, 2))
    # p.istft()
    # p.write_audio_to_file(song + '_harm2.wav')
    # return

    loudness = 20
    attenuation = 0.1
    # ps = np.array(ps * (ps < loudness) * attenuation + ps * (ps > loudness), dtype='int8')
    # ps = np.array(ps * (ps < loudness), dtype='int8')

    step_size = 24
    hop_size = step_size // 6
    num_blocks = int(((sig.stft_length - step_size) / hop_size + 1))
    m_avg = 3

    # for layered_song.wav
    # inst_start_points = [2, 12, 21, 31]
    # inst_end_points = [40, 50, 59, 68]

    # # for layered_song2.wav
    inst_start_points = [15, 30, 60, 75]
    inst_end_points = [45, 75]

    # for layered_song3.wav
    # inst_start_points = [10, 36, 62]
    # inst_end_points = [20, 46, 73]
    # inst_change_points = [31, 52]

    harm_sparsity = []
    harm1_sparsity = []
    perc_sparsity = []
    for step in np.arange(step_size, sig.stft_length, step_size):
        harm_sub = harm[:, step - step_size: step]
        # harm1_sub = harm1[:, step - step_size: step]
        perc_sub = perc[:, step - step_size: step]
        harm_sparsity.append(1.0 / kurtosis(harm_sub))
        # harm1_sparsity.append(1.0 / kurtosis(harm1_sub))
        perc_sparsity.append(1.0 / kurtosis(perc_sub))

    # for hop in range(num_blocks):
    #     start = hop * hop_size
    #     end = start + step_size
    #     window = ps[:, start:end]
    #     sparsity.append(1.0 / kurtosis(window))

    harm_sparsity = np.nan_to_num(np.array(harm_sparsity))
    harm1_sparsity = np.nan_to_num(np.array(harm1_sparsity))
    perc_sparsity = np.nan_to_num(np.array(perc_sparsity))

    move_max = bn.move_max(harm_sparsity, m_avg)
    move_min = bn.move_min(harm_sparsity, m_avg)
    move_med = bn.move_median(harm_sparsity, m_avg)[m_avg:]
    move_avg = bn.move_mean(harm_sparsity, m_avg)[m_avg:]

    plt.close('all')
    time = np.arange(0, sig.signal_duration, sig.signal_duration / len(harm_sparsity))[:len(harm_sparsity)]
    # plt.step(time, harm_sparsity, label='harmonic')
    # plt.step(time, harm1_sparsity, label='harm1')
    # plt.step(time, perc_sparsity, label='percussive')

    # for i in inst_start_points:
    #     plt.plot((i, i), (-1e20, 1e20), 'g--')
    # for i in inst_end_points:
    #     plt.plot((i, i), (-1e20, 1e20), 'r--')
    # for i in inst_change_points:
    #     plt.plot((i, i), (-1e20, 1e20), 'b--')

    plt.plot(np.arange(0, sig.signal_duration, sig.signal_duration / len(move_avg))[:len(move_avg)],
             move_med, label='moving median = {}'.format(m_avg))

    plt.ylim((0, max(harm_sparsity) * 1.1))
    plt.legend()
    plt.xlabel('Time (s)')
    plt.title(song + ' kurtosis$^{-1}$ win=24, hpss')
    plt.savefig(song + '/kurtosis_inv_win24_hpss1_just_avg1_no_lines.png')


def l_zero(matrix):
    """
    l zero norm for matrix sparsity
    Just counts num of zero elements in array
    :param matrix:
    :return:
    """
    return (matrix == 0).sum()


def l_zero_eps(matrix, eps):
    """
    l zero norm for matrix sparsity with an epsilon
    Counts haw many elements are below epsilon
    :param matrix:
    :param eps: int between 0 and 80
    :return:
    """
    return (matrix <= eps).sum()


def l_one(matrix):
    """
    l one norm
    :param matrix:
    :return:
    """
    return - matrix.sum()


def l_p(matrix, p):
    """
    l p norm
    :param matrix:
    :param p: p > 1
    :return:
    """
    assert p > 1
    matrix = np.array(matrix, dtype=float)
    return - ((matrix ** (1.0 / p)).sum() ** p)


def l_two_over_l_one(matrix):
    """
    l2 / l1 norm
    :param matrix:
    :return:
    """
    matrix = np.array(matrix, dtype=float)
    return np.nan_to_num(l_p(matrix, 2) / l_one(matrix))


def log(matrix):
    """

    :param matrix:
    :return:
    """
    matrix = np.array(matrix, dtype=float)
    return - np.log(matrix ** 2 + 1).sum()


def tanh_sparsity(matrix, a, b):
    """

    :param matrix:
    :param a:
    :param b:
    :return:
    """
    matrix = np.array(matrix, dtype=float)
    return - np.nan_to_num(- np.tanh( (matrix * a) ** b).sum())


def kurtosis(matrix):
    """

    :param matrix:
    :return:
    """
    matrix = np.array(matrix, dtype=float)
    return np.nan_to_num((matrix ** 4).sum() / ((matrix ** 2).sum() ** 2))


def hoyer(matrix):
    matrix = np.array(matrix, dtype=float)
    N = np.sqrt(matrix.size)
    return (N - (matrix.sum() / np.sqrt((matrix ** 2).sum()) )) / (N - 1)


def gini(matrix):
    """Calculate the Gini coefficient of a numpy array."""
    # based on bottom eq: http://www.statsdirect.com/help/content/image/stat0206_wmf.gif
    # from: http://www.statsdirect.com/help/default.htm#nonparametric_methods/gini.htm
    matrix = np.array(matrix, dtype=float)
    matrix = matrix.flatten() # all values are treated equally, arrays must be 1d
    if np.amin(matrix) < 0:
        matrix -= np.amin(matrix) # values cannot be negative
    matrix += 0.0000001 # values cannot be 0
    matrix = np.sort(matrix) # values must be sorted
    index = np.arange(1, matrix.shape[0] + 1) # index per array element
    n = matrix.shape[0] # number of array elements
    return (np.sum((2 * index - n - 1) * matrix)) / (n * np.sum(matrix)) #Gini coefficient

if __name__ == '__main__':
    main()