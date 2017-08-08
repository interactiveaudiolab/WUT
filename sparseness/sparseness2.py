# import nimfa
import nussl
import numpy as np
import librosa
import matplotlib.pyplot as plt
import bottleneck as bn


def main():
    path = 'layered_song3.wav'
    sig = nussl.AudioSignal(path)
    sig.to_mono(overwrite=True)
    stft = sig.stft()
    ps = np.array(librosa.logamplitude(np.abs(stft) ** 2, ref_power=np.max), dtype='int8') + 80

    step_size = 25
    m_avg = 3

    # # for layered_song.wav
    # inst_start_points = [2, 12, 21, 31]
    # inst_end_points = [40, 50, 59, 68]

    # # for layered_song2.wav
    # inst_start_points = [15, 30, 60, 75]
    # inst_end_points = [45, 75]

    # for layered_song3.wav
    inst_start_points = [10, 36, 62]
    inst_end_points = [20, 46, 73]
    inst_change_points = [31, 52]

    power_sparsity = []
    for step in np.arange(step_size, sig.stft_length, step_size):
        step_sub = ps[:, step - step_size: step, 0]
        power_sparsity.append(np.sum(step_sub))

    power_sparsity = np.array(power_sparsity)

    move_max = bn.move_max(power_sparsity, m_avg)
    move_min = bn.move_min(power_sparsity, m_avg)
    move_med = bn.move_median(power_sparsity, m_avg)


    plt.close('all')
    # plt.step(np.arange(0, sig.signal_duration, sig.signal_duration / len(power_sparsity)), power_sparsity)

    for i in inst_start_points:
        plt.plot((i, i), (-1000, 10000000), 'g--')
    for i in inst_end_points:
        plt.plot((i, i), (-1000, 10000000), 'r--')
    for i in inst_change_points:
        plt.plot((i, i), (-1000, 10000000), 'b--')

    # plt.plot(np.arange(0, sig.signal_duration, sig.signal_duration / len(move_max)), move_max, ':')
    # plt.plot(np.arange(0, sig.signal_duration, sig.signal_duration / len(move_min)), move_min, ':')
    # plt.plot(np.arange(0, sig.signal_duration, sig.signal_duration / len(move_med)), move_med, ':')

    plt.ylim((2, max(power_sparsity) * 1.1))
    # plt.yscale('log')
    plt.xlabel('Time (s)')
    plt.title('layered_song3.wav sparsity, step size {} tf bins, move=3'.format(step_size))
    plt.savefig('sparsity_layered3_moving_all2.png')


if __name__ == '__main__':
    main()