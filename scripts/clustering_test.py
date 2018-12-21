import sys
import os

sys.path.insert(0, "../app/nussl")

import nussl
import sklearn
import numpy as np
import librosa

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
from matplotlib import ticker
from matplotlib import gridspec

RUN_DC = True


def main():
    dsd_folder = "/Users/ethanmanilow/Documents/School/Research/Predicting SDR values/MedleyDB_sample/Audio/LizNelson_Rainfall"
    model_path = "/Users/ethanmanilow/Documents/School/Research/audio_representations/website/backend/models/data/models/deep_clustering_vocals_44k_long.model"
    cutoff = -40

    # for song_path in dsd_folder:
    # Load 'em all into memory
    song_path = "/Users/ethanmanilow/Documents/School/Research/audio_representations/website/backend/scripts/test_files"
    mix_path = os.path.join(song_path, "mix.wav")
    vox_path = os.path.join(song_path, "vox.wav")
    bk_path = os.path.join(song_path, "gtr.wav")
    mix = nussl.AudioSignal(mix_path)
    mix.to_mono(overwrite=True)
    vox = nussl.AudioSignal(vox_path)
    vox.to_mono(overwrite=True)
    bak = nussl.AudioSignal(bk_path)
    bak.to_mono(overwrite=True)

    gt_vox_mask, gt_bak_mask, sm = mel_mask(
        mix,
        vox,
        bak,
        mix.sample_rate,
        bg_mask_inverse=False,
        silence_mask_cutoff=cutoff,
    )

    plot_mask(gt_vox_mask, "output", "gt_vox_mask.png")
    plot_mask(gt_bak_mask, "output", "gt_bak_mask.png")
    plot_mask(sm, "output", "silence_mask.png")
    plot_mask(psd_mask(mix, vox), "output", "gt_vox_psd_mask.png")
    plot_mask(psd_mask(mix, bak), "output", "gt_bak_psd_mask.png")

    if RUN_DC:
        dc = nussl.DeepClustering(
            mix,
            model_path=model_path,
            mask_type="binary",
            do_mono=True,
            return_mel_masks=True,
            pca_before_clustering=False,
            cutoff=cutoff,
        )
        dc_vox_mask, dc_bk_mask, binned, mel, scaled = deep_clustering_mask(dc)
        dc_vox_mask, dc_bk_mask = dc_vox_mask.get_channel(0), dc_bk_mask.get_channel(0)

        np.save(os.path.join("pickles", "gt_vox_mask.npy"), gt_vox_mask)
        np.save(os.path.join("pickles", "gt_bak_mask.npy"), gt_bak_mask)
        np.save(os.path.join("pickles", "dc_vox_mask.npy"), dc_vox_mask)
        np.save(os.path.join("pickles", "dc_bak_mask.npy"), dc_bk_mask)
        np.save(os.path.join("pickles", "binned.npy"), binned)
        np.save(os.path.join("pickles", "scaled.npy"), scaled)
    #
    else:

        gt_vox_mask = np.load(os.path.join("pickles", "gt_vox_mask.npy"))
        gt_bak_mask = np.load(os.path.join("pickles", "gt_bk_mask.npy"))
        dc_vox_mask = np.load(os.path.join("pickles", "dc_vox_mask.npy"))
        dc_bk_mask = np.load(os.path.join("pickles", "dc_bk_mask.npy"))
        binned = np.load(os.path.join("pickles", "binned.npy"))
        scaled = np.load(os.path.join("pickles", "scaled.npy"))

    # incorrect_vox = np.logical_xor(gt_vox_mask, dc_vox_mask.get_channel(0))
    incorrect_vox = np.logical_and(gt_vox_mask, np.logical_not(dc_vox_mask))
    incorrect_bk = np.logical_and(gt_bak_mask, np.logical_not(dc_bk_mask))
    # incorrect_vox = gt_bk_mask

    inc_reshaped_vox = incorrect_vox.flatten()
    inc_reshaped_bk = incorrect_bk.flatten()
    reshaped_gt_vox = gt_vox_mask.flatten()
    reshaped_gt_bk = gt_bak_mask.flatten()
    reshaped_dc_vox = dc_vox_mask.flatten()
    reshaped_dc_bk = dc_bk_mask.flatten()

    binned_incorrect_vox = np.zeros((100, 100))
    binned_incorrect_bg = np.zeros((100, 100))
    binned_dc_vox = np.zeros((100, 100))
    binned_dc_bg = np.zeros((100, 100))
    binned_vox = np.zeros((100, 100))
    binned_bg = np.zeros((100, 100))
    for idx, (x, y) in enumerate(scaled):
        if inc_reshaped_vox[idx]:
            binned_incorrect_vox[y, x] += 1
        if inc_reshaped_bk[idx]:
            binned_incorrect_bg[y, x] += 1
        if reshaped_gt_vox[idx]:
            binned_vox[y, x] += 1
        if reshaped_gt_bk[idx]:
            binned_bg[y, x] += 1
        if reshaped_dc_vox[idx]:
            binned_dc_vox[y, x] += 1
        if reshaped_dc_bk[idx]:
            binned_dc_bg[y, x] += 1

    full_bins = np.zeros((100, 100))
    for i, list1 in enumerate(binned):
        for j, list2 in enumerate(list1):
            full_bins[i, j] = len(list2)

    make_plots(
        full_bins,
        binned_vox,
        binned_bg,
        binned_dc_vox,
        binned_dc_bg,
        "LizNelson_Rainfall",
        "output",
    )


def psd_mask(mix, src):
    mix.stft()
    src.stft()

    return librosa.util.softmask(
        src.get_power_spectrogram_channel(0),
        mix.get_power_spectrogram_channel(0),
        power=np.inf,
    ).T


def plot_mask(mask, output_dir, file_name):
    plt.close("all")
    plt.imshow(mask.T, aspect="auto")
    plt.gca().invert_yaxis()
    plt.savefig(os.path.join(output_dir, file_name))


def make_plots(full_bins, gt_vox, gt_bak, dc_vox, dc_bak, song_title, output_dir):

    song_filename = song_title.replace(" ", "")

    for log in [True, False]:

        # Make slice plots
        plt.close("all")
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(figsize=(12, 9), ncols=2, nrows=2)
        plt.suptitle("Automatic Deep Clustering on {}".format(song_title))

        ax1.step(np.arange(100), np.sum(gt_vox, axis=0), label="Ideal Binary Mask")
        ax1.step(
            np.arange(100),
            np.sum(dc_vox, axis=0),
            linestyle="--",
            label="Deep Clustering Mask",
        )
        ax1.legend(loc="upper right", shadow=False, fontsize="medium")
        if log:
            ax1.set_yscale("log")
        ax1.set_title(r"Vocals: Sum along y-axis")

        ax2.step(np.arange(100), np.sum(gt_bak, axis=0))
        ax2.step(np.arange(100), np.sum(dc_bak, axis=0), linestyle="--")
        if log:
            ax2.set_yscale("log")
        ax2.set_title(r"Background: Sum along y-axis")

        ax3.step(np.arange(100), np.sum(gt_vox, axis=1))
        ax3.step(np.arange(100), np.sum(dc_vox, axis=1), linestyle="--")
        if log:
            ax3.set_yscale("log")
        ax3.set_title(r"Vocals: Sum along x-axis")

        ax4.step(np.arange(100), np.sum(gt_bak, axis=1))
        ax4.step(np.arange(100), np.sum(dc_bak, axis=1), linestyle="--")
        if log:
            ax4.set_yscale("log")
        ax4.set_title(r"Background: Sum along x-axis")

        if log:
            plt.savefig(
                os.path.join(output_dir, "{}_axes_sums_log.png".format(song_filename))
            )
        else:
            plt.savefig(
                os.path.join(output_dir, "{}_axes_sums.png".format(song_filename))
            )

        # Heat map sums with full embedding space
        plt.close("all")
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(figsize=(12, 9), ncols=2, nrows=2)
        plt.suptitle("Automatic Deep Clustering on {}".format(song_title))

        ax1.step(np.arange(100), np.sum(gt_vox, axis=0))
        ax1.step(np.arange(100), np.sum(dc_vox, axis=0), linestyle="--")
        ax1.step(np.arange(100), np.sum(full_bins, axis=0), linestyle="-.")
        if log:
            ax1.set_yscale("log")
        ax1.set_title(r"Vocals: Sum along y-axis")

        ax2.step(np.arange(100), np.sum(gt_bak, axis=0))
        ax2.step(np.arange(100), np.sum(dc_bak, axis=0), linestyle="--")
        ax2.step(np.arange(100), np.sum(full_bins, axis=0), linestyle="-.")
        if log:
            ax2.set_yscale("log")
        ax2.set_title(r"Background: Sum along y-axis")

        ax3.step(np.arange(100), np.sum(gt_vox, axis=1), label="Ideal Binary Mask")
        ax3.step(
            np.arange(100),
            np.sum(dc_vox, axis=1),
            linestyle="--",
            label="Deep Clustering Mask",
        )
        ax3.step(
            np.arange(100),
            np.sum(full_bins, axis=1),
            linestyle="-.",
            label="Full Embedding Space",
        )
        ax3.legend(loc="upper right", shadow=False, fontsize="medium")
        if log:
            ax3.set_yscale("log")
        ax3.set_title(r"Vocals: Sum along x-axis")

        ax4.step(np.arange(100), np.sum(gt_bak, axis=1))
        ax4.step(np.arange(100), np.sum(dc_bak, axis=1), linestyle="--")
        ax4.step(np.arange(100), np.sum(full_bins, axis=1), linestyle="-.")
        if log:
            ax4.set_yscale("log")
        ax4.set_title(r"Background: Sum along x-axis")

        if log:
            plt.savefig(
                os.path.join(
                    output_dir, "{}_axes_sums_embedding_log.png".format(song_filename)
                )
            )
        else:
            plt.savefig(
                os.path.join(
                    output_dir, "{}_axes_sums_embedding.png".format(song_filename)
                )
            )

    # Heat maps
    plt.close("all")
    fig = plt.figure(figsize=(12, 9))  # , tight_layout=True)
    gs = gridspec.GridSpec(2, 3)
    gt_vox += 1e-1
    gt_bak += 1e-1
    dc_vox += 1e-1
    dc_bak += 1e-1
    full_bins += 1e-1
    plt.suptitle("Automatic Deep Clustering on {}".format(song_title))

    ax1 = fig.add_subplot(gs[0, 0])
    ax1.imshow(gt_vox, norm=LogNorm(vmin=1, vmax=np.max(full_bins)))
    ax1.set_title(r"Vocals: Ideal Binary Mask")

    ax2 = fig.add_subplot(gs[0, 1])
    ax2.imshow(gt_bak, norm=LogNorm(vmin=1, vmax=np.max(full_bins)))
    ax2.set_title(r"Background: Ideal Binary Mask")

    ax3 = fig.add_subplot(gs[1, 0])
    ax3.imshow(dc_vox, norm=LogNorm(vmin=1, vmax=np.max(full_bins)))
    ax3.set_title(r"Vocals: Deep Clustering Mask")

    ax4 = fig.add_subplot(gs[1, 1])
    ax4.imshow(dc_bak, norm=LogNorm(vmin=1, vmax=np.max(full_bins)))
    ax4.set_title(r"Background: Deep Clustering Mask")

    ax5 = fig.add_subplot(gs[:, 2])
    hm = ax5.imshow(full_bins, norm=LogNorm(vmin=1, vmax=np.max(full_bins)))
    ax5.set_title("Full embedding space")

    fig.colorbar(hm, ax=ax5, orientation="horizontal")

    # for ax in fig.axes:
    #     ax.get_xaxis().set_ticks([])
    #     ax.get_yaxis().set_ticks([])

    plt.savefig(os.path.join(output_dir, "{}_heat_maps.png".format(song_filename)))

    # Diff plots
    plt.close("all")
    fig, (ax1, ax2) = plt.subplots(figsize=(12, 9), ncols=2)
    plt.suptitle("Automatic Deep Clustering on {}".format(song_title))
    vox_diff = np.maximum(gt_vox - dc_vox, 1e-7)
    bg_diff = np.maximum(gt_bak - dc_bak, 1e-7)

    ax1.imshow(
        vox_diff, norm=LogNorm(vmin=1, vmax=np.max([np.max(vox_diff), np.max(bg_diff)]))
    )
    ax1.set_title(r"Vocals: IBM Mask $-$ DC Mask")

    hm = ax2.imshow(
        bg_diff, norm=LogNorm(vmin=1, vmax=np.max([np.max(vox_diff), np.max(bg_diff)]))
    )
    ax2.set_title(r"Background: IBM Mask $-$ DC Mask")
    fig.colorbar(hm, ax=(ax1, ax2), orientation="horizontal")

    # for ax in fig.axes:
    #     ax.get_xaxis().set_ticks([])
    #     ax.get_yaxis().set_ticks([])

    plt.savefig(os.path.join(output_dir, "{}_diff_heat_maps.png".format(song_filename)))


def get_coordinate_from_TF_index(index, inner_dim):  # inner_dim == 150
    return np.floor(index / inner_dim), index % inner_dim


def remove_vals(bins, vals_to_remove):
    for idx, val in enumerate(vals_to_remove):
        if not val:  # remove all correct values
            found = False
            for i in bins:
                if found:
                    break
                for j in i:
                    if idx in j:
                        j.remove(idx)
                        found = True
                        break
    return bins


def deep_clustering_mask(dc):
    dc_vox_mask, dc_bk_mask = dc.run()
    binned, mel, scaled = _massage_data(
        (dc.project_arbitrary_embeddings(), dc.mel_spectrogram)
    )
    return dc_vox_mask, dc_bk_mask, binned, mel, scaled


def _massage_data(data):
    # Scale and bin PCA points
    pca, mel = data

    dim = 99
    scaled = _scale_pca(pca, dim)
    binned = _bin_matrix(scaled, _make_square_matrix(dim + 1))

    # transpose mel
    mel = mel[0].T

    return binned, mel, scaled


def _find_pca_min_max(pca):
    """
        Takes Zx2 numpy array and returns tuples of tuples giving min and
        max along each dimension
    """
    mins = np.amin(pca, 0)
    maxes = np.amax(pca, 0)
    return (mins[0], maxes[0]), (mins[1], maxes[1])


def _scale_pca(pca, new_max=99, new_min=0):
    """
        takes Zx2 (specifically TFx2 as used) numpy array and scales all
        coordinates
    """
    x_edges, y_edges = _find_pca_min_max(pca)

    scale_and_clean = lambda coord: _clean_coordinates(
        coord, x_edges, y_edges, new_max, new_min
    )
    return np.apply_along_axis(scale_and_clean, 1, pca)


def _scale_num(num, _min, _max, scaled_min, scaled_max):
    """
        Scales given number between given scaled_min and scaled_max.
        _min and _max of source distribution needed for scaling.
    """
    return (((scaled_max - scaled_min) * (num - _min)) / (_max - _min)) + scaled_min


def _clean_coordinates(coord, x_edges, y_edges, new_max=99, new_min=0):
    """
        coord is x, y tuple (technically two item list), edges are tuples
        holding min and max values along respective axes. new_max and
        new_min specify range to scale points to.
    """
    return (
        int(round(_scale_num(coord[0], x_edges[0], x_edges[1], new_min, new_max))),
        int(round(_scale_num(coord[1], y_edges[0], y_edges[1], new_min, new_max))),
    )


def _make_square_matrix(dim=100):
    """
        Generates 3D array where inner cells are empty arrays
    """
    return [[[] for x in range(dim)] for y in range(dim)]


def _bin_matrix(scaled_tf, matrix):
    """
        Given scaled Zx2 array, bins indices of coordinates
    """
    # come back to this
    # don't know why but x and y need to be swapped here
    for index, (y, x) in enumerate(scaled_tf):
        matrix[x][y].append(index)

    return matrix


def mel_mask(mix, vox, bg, sr, bg_mask_inverse=False, silence_mask_cutoff=-40):
    num_mels = 150
    mel_filter_bank = librosa.filters.mel(sr, mix.stft_params.n_fft_bins, num_mels).T
    mix_mel, silence_mask = to_mel(
        mix, mel_filter_bank, silence_mask_cutoff=silence_mask_cutoff
    )
    vox_mel = to_mel(vox, mel_filter_bank)
    bg_mel = to_mel(bg, mel_filter_bank)

    vox_mask = librosa.util.softmask(vox_mel, mix_mel, power=np.inf)
    bg_mask = (
        np.logical_not(vox_mask)
        if bg_mask_inverse
        else librosa.util.softmask(bg_mel, mix_mel, power=np.inf)
    )

    vox_mask *= silence_mask
    bg_mask *= silence_mask
    return vox_mask, bg_mask, silence_mask


def to_mel(sig, mel_filter_bank, silence_mask_cutoff=0):
    sig.stft()
    stft_ch = sig.get_magnitude_spectrogram_channel(0)
    magnitude = np.abs(stft_ch)
    mel_spectrogram = np.dot(magnitude.T, mel_filter_bank)
    mel_spectrogram = 10.0 * np.log10(mel_spectrogram ** 2 + 1e-7)
    silence_mask = mel_spectrogram > silence_mask_cutoff
    mel_spectrogram += np.abs(np.min(mel_spectrogram))

    if silence_mask_cutoff:
        return mel_spectrogram, silence_mask

    return mel_spectrogram


if __name__ == "__main__":
    main()
