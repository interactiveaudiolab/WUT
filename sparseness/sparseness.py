# import nimfa
import nussl
import numpy as np
import librosa
import matplotlib.pyplot as plt
import bottleneck as bn


def main():
    path = 'layered_song.wav'
    sig = nussl.AudioSignal(path)
    sig.to_mono(overwrite=True)
    stft = sig.stft()
    ps = np.array(librosa.logamplitude(np.abs(stft) ** 2, ref_power=np.max), dtype='int8') + 80

    step_size = 25
    m_avg = 5

    # for layered_song.wav
    inst_start_points = [2, 12, 21, 31]
    inst_end_points = [40, 50, 59, 68]

    # # for layered_song2.wav
    # inst_start_points = [15, 30, 60, 75]
    # inst_end_points = [45, 75]

    # # for layered_song3.wav
    # inst_start_points = [10, 36, 62]
    # inst_end_points = [20, 46, 73]
    # inst_change_points = [31, 52]

    nimfa_sparsity = []
    power_sparsity = []
    for step in np.arange(step_size, sig.stft_length, step_size):
        step_sub = ps[:, step - step_size: step, 0]
        nimfa_sparsity.append(nimfa_sparseness(step_sub))
        power_sparsity.append(np.sum(step_sub))

    # interpolate nans
    nimfa_sparsity = (np.array(nimfa_sparsity) * -1) + 2.0
    # nimfa_sparsity = np.pad(nimfa_sparsity, (step_size, step_size*3), 'constant', constant_values=(0, 0))
    # nimfa_sparsity = moving_average(nimfa_sparsity, n=m_avg)
    mask = np.isnan(nimfa_sparsity)
    nimfa_sparsity[mask] = np.interp(np.flatnonzero(mask), np.flatnonzero(~mask), nimfa_sparsity[~mask])

    plt.close('all')
    plt.step(np.arange(0, sig.signal_duration, sig.signal_duration / len(nimfa_sparsity)), nimfa_sparsity)
    # plt.step(np.arange(0, sig.signal_duration, sig.signal_duration / len(power_sparsity)), power_sparsity)

    for i in inst_start_points:
        plt.plot((i, i), (-1000, 10000000), 'g--')
    for i in inst_end_points:
        plt.plot((i, i), (-1000, 10000000), 'r--')
    # for i in inst_change_points:
    #     plt.plot((i, i), (-1000, 10000000), 'b--')
    # plt.ylim((2, max(power_sparsity)*1.1))
    plt.ylim((2, max(nimfa_sparsity)*1.1))
    # plt.yscale('log')
    plt.xlabel('Time (s)')
    plt.title('layered_song3.wav nimfa sparsity, step size {} tf bins'.format(step_size))
    plt.savefig('sparsity_layered1_nimfa_log.png')


def nimfa_sparseness(x):
    eps = np.finfo(x.dtype).eps if 'int' not in str(x.dtype) else 1e-9
    x1 = np.sqrt(x.shape[0]) - (abs(x).sum() + eps) / \
                            (np.sqrt(np.multiply(x, x).sum()) + eps)
    x2 = np.sqrt(x.shape[0]) - 1
    return x1 / x2


def moving_average(a, n=3) :
    ret = np.cumsum(a, dtype=float)
    ret[n:] = ret[n:] - ret[:-n]
    return np.array(ret[n - 1:] / n)

if __name__ == '__main__':
    main()