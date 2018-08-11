import sys
import os
sys.path.insert(0, '../app/nussl')

import nussl
import sklearn
import numpy as np
import librosa

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import time
import matplotlib.dates as md
from matplotlib.colors import LogNorm
from matplotlib import ticker
from matplotlib import gridspec

from MulticoreTSNE import MulticoreTSNE as TSNE

import clustering_test as ct

RUN_DC = False


def main():
    model_path = '/Users/ethanmanilow/Documents/School/Research/audio_representations/website/backend/models/data/models/deep_clustering_vocals_44k_long.model'
    cutoff = -40
    output_dir = os.path.join('output', 'tdc_test')

    # for song_path in dsd_folder:
    # Load 'em all into memory
    song_path = '/Users/ethanmanilow/Documents/School/Research/audio_representations/website/backend/scripts/test_files'
    mix_path = os.path.join(song_path, 'mix.wav')
    vox_path = os.path.join(song_path, 'vox.wav')
    bk_path = os.path.join(song_path, 'gtr.wav')
    mix = nussl.AudioSignal(mix_path)
    mix.to_mono(overwrite=True)
    vox = nussl.AudioSignal(vox_path)
    vox.to_mono(overwrite=True)
    bak = nussl.AudioSignal(bk_path)
    bak.to_mono(overwrite=True)

    n_bins = 100

    if RUN_DC:
        gt_vox_mask, gt_bak_mask, sm = ct.mel_mask(mix, vox, bak, mix.sample_rate,
                                                   bg_mask_inverse=False,
                                                   silence_mask_cutoff=cutoff)

        dc = nussl.DeepClustering(mix, model_path=model_path, mask_type='binary', do_mono=True,
                                  return_mel_masks=True, pca_before_clustering=False, cutoff=cutoff)
        dc_vox_mask, dc_bk_mask, binned, mel, scaled = ct.deep_clustering_mask(dc)
        dc_vox_mask, dc_bk_mask = dc_vox_mask.get_channel(0), dc_bk_mask.get_channel(0)

    else:
        dc_vox_mask = np.load(os.path.join('pickles', 'dc_vox_mask.npy'))
        dc_bk_mask = np.load(os.path.join('pickles', 'dc_bk_mask.npy'))
        binned = np.load(os.path.join('pickles', 'binned.npy'))
        scaled = np.load(os.path.join('pickles', 'scaled.npy'))

        tdc_space = np.zeros((n_bins, dc_vox_mask.shape[0]))

        for (i, j), tf_list in np.ndenumerate(binned):
            for item in tf_list:
                t, f = get_coordinate_from_TF_index(item, dc_vox_mask.shape[1])
                tdc_space[j, t] += 1

        plot_tdc(tdc_space, mix.time_vector[-1], output_dir, 'tdc_test3.png')



def tsne_test():
    model_path = '/Users/ethanmanilow/Documents/School/Research/audio_representations/website/backend/models/data/models/deep_clustering_vocals_44k_long.model'
    cutoff = -40
    output_dir = os.path.join('output', 'tsne_test')

    # for song_path in dsd_folder:
    # Load 'em all into memory
    song_path = '/Users/ethanmanilow/Documents/School/Research/audio_representations/website/backend/scripts/test_files'
    mix_path = os.path.join(song_path, 'mix.wav')
    vox_path = os.path.join(song_path, 'vox.wav')
    bk_path = os.path.join(song_path, 'gtr.wav')
    mix = nussl.AudioSignal(mix_path)
    mix.to_mono(overwrite=True)
    vox = nussl.AudioSignal(vox_path)
    vox.to_mono(overwrite=True)
    bak = nussl.AudioSignal(bk_path)
    bak.to_mono(overwrite=True)

    dc = nussl.DeepClustering(mix, model_path=model_path, mask_type='binary', do_mono=True,
                              return_mel_masks=True, pca_before_clustering=False, cutoff=cutoff)
    dc.run()

    tsne = TSNE(verbose=2, n_jobs=6)
    tsne_space = tsne.fit_transform(dc.embeddings)

    plt.close('all')

    hm = plt.imshow(tsne_space)#, norm=LogNorm(vmin=1, vmax=np.max([np.max(vox_diff), np.max(bg_diff)])))
    plt.title(r'TSNE Space')
    plt.colorbar(hm)

    plt.savefig(os.path.join(output_dir, '{}_tsne.png'.format('test')))


def get_coordinate_from_TF_index(index, inner_dim):  # inner_dim == 150
    return index / inner_dim, index % inner_dim


def attempt2(scaled, dc_vox_mask, output_dir, mix):
    scaled_reshape = scaled.reshape(dc_vox_mask.shape[0], dc_vox_mask.shape[1], 2)
    scaled_axis = scaled_reshape[:, :, 0]
    tdc_space = np.array([scaled_axis[t, :]
                          for t in range(dc_vox_mask.shape[0])], dtype=float).T

    plot_tdc(tdc_space, mix.time_vector[-1], output_dir, 'tdc_test2.png')

def attempt1(dc, mix, output_dir):
    pca = sklearn.decomposition.PCA(n_components=1)
    n_bins = 75
    bins = np.arange(-1.0, 1.0, n_bins)
    dc_vox_mask, dc_bk_mask = dc.run()
    pca_embeddings = pca.fit_transform(dc.embeddings)

    dc_vox_mask, dc_bk_mask = dc_vox_mask.get_channel(0), dc_bk_mask.get_channel(0)

    pca_embeddings_reshape = pca_embeddings.reshape(dc_vox_mask.shape)

    tdc_space = np.array([np.histogram(pca_embeddings_reshape[t, :], bins=n_bins)[0]
                          for t in range(dc_vox_mask.shape[0])]).T

    plot_tdc(tdc_space, mix.time_vector[-1], output_dir, 'tdc_test1.png')


def plot_tdc(tdc, t_max, output_dir, name):
    plt.close('all')
    fig = plt.figure(1, figsize=(64, 9))
    plt.suptitle('Temporal Deep Clustering', fontsize=40)
    tdc_heatmap_ax = plt.axes([0.15, 0.1, 0.8, 0.8])
    tdc_sum_ax = plt.axes([0.025, 0.1, 0.1, 0.8])

    tdc_log = librosa.amplitude_to_db(tdc.astype('float') +  1e-7)
    time_vect = np.linspace(0.0, t_max, tdc.shape[1])
    mel_vect = np.arange(0.0, tdc.shape[0])
    x, y = np.meshgrid(time_vect, mel_vect)
    hm = tdc_heatmap_ax.contourf(x, y, np.flipud(tdc_log))

    xfmt = matplotlib.ticker.FuncFormatter(lambda sec, x: time.strftime('%M:%S', time.gmtime(sec)))
    tdc_heatmap_ax.xaxis.set_major_formatter(xfmt)
    tdc_heatmap_ax.xaxis.set_ticks(np.linspace(0.0, t_max, 48))
    cb_axes = fig.add_axes([0.97, 0.1, 0.01, 0.8])
    fig.colorbar(hm, cax=cb_axes)

    tdc_sum_ax.fill_between(np.sum(tdc, axis=1)[::-1], np.arange(tdc.shape[0]), step="pre")
    tdc_sum_ax.set_ylim(0, tdc.shape[0])
    plt.savefig(os.path.join(output_dir, name))


def playground():

    rand = np.random.rand(150, 1324, 40)

    rand_trans = rand.reshape(rand.shape[0], rand.shape[1] * rand.shape[2])
    standardized = sklearn.preprocessing.StandardScaler().fit_transform(rand_trans)

    pca = sklearn.decomposition.PCA(n_components=2)

    fit = pca.fit_transform(standardized)

    i = 0




if __name__ == '__main__':
    tsne_test()