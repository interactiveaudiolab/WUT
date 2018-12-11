import numpy as np
from torch.utils.data import Dataset
from typing import Dict, Any, List, Tuple

class AnnotationDataset(Dataset):

    # TODO: discuss API here
    #    mixes: np.ndarray,
    #    assignments: np.ndarray,
    #    weights: np.ndarray = None,
    # TODO: work for multiple examples
    def __init__(
        self,
        options: Dict[str, Any],
        log_spectrogram: np.ndarray,
        assignments: np.ndarray,
        magnitude_spectrogram,
    ):
        """Dataset for retraining using user annotations on interactive
        visualizations

        Args:
            options - a dictionary of options specifying behavior of the datset.
                See [here](https://github.com/pseeth/experiments/blob/refactor/code/config/defaults/metadata/dataset.json)
                for full description.
            mixes - a numpy array of shape `mxFxT` where `m` is number of
                training examples, `F` is frequency, `T` is time. Inner values
                are floats (the magnitude of the signal at that time, frequency
                point)

                Note: in the future would be nice to add typing, see refs:
                    - https://github.com/numpy/numpy/issues/7370
                    - https://stackoverflow.com/questions/35673895/type-hinting-annotation-pep-484-for-numpy-ndarray
            assignments - a numpy array of shape `mxFxTxn` where `m` is number
                of training examples, `n` is number of sources, `F` is
                frequency, and `T` is time. Inner values can be ints for a
                binary mask or floats for a soft mask. The value indicates which
                source corresponds to the specific `TxF` bin of the spectrogram.
                Note: same typing comment as for `assignments` above
            weights - a numpy array of floats w/ shape `FxT` where the value
                corresponds to the importance the model should place on getting
                that specific point correct.
                Note: same typing comment as for `assignments` above
        """
        self.options = options
        self.log_spectrogram = log_spectrogram
        self.magnitude_spectrogram = magnitude_spectrogram
        self.assignments = assignments
        self.weights = self.magnitude_weights(self.magnitude_spectrogram)
        print(f'magnitude_spectrogram type, shape: {type(self.magnitude_spectrogram)}, {self.magnitude_spectrogram.shape}')
        print(f'self.log_spectrogram type, shape: {type(self.log_spectrogram)}, {self.log_spectrogram.shape}')
        print(f'assignments type, shape: {type(self.assignments)}, {self.assignments.shape}')
        print(f'weights type, shape: {type(self.weights)}, {self.weights.shape}')
        print(f'options: {self.options}')

        """
        log_spectrogram, mix_stft, _ = self.transform(
            mix,
            self.options['n_fft'],
            self.options['hop_length'],
        )
        self.log_spectrogram = log_spectrogram

        self.weights = (
            weights
            if weights
            self.magnitude_weights()
        )

        self.assignments = assignments
        self.targets = [
            'log_spectrogram',
            'assignments',
            'weights'
        ]
        """

    def __len__(self):
        """Returns number of examples in dataset"""
        # TODO: make work with multiple examples
        # return self.assignments.shape[0] # number of training examples
        return 50 # num_iterations

    def __getitem__(self, i):
        """Gets one item from dataset

        Args:
            i - index of example to get

        Returns:
            one data point (an output dictionary containing the data comprising
            one example)
        """
        return {
            'log_spectrogram': self.log_spectrogram,
            'weights': self.weights,
            'assignments': self.assignments,
        }

    def _construct_input_output(
        self,
        mix: np.ndarray,
        sources: np.ndarray
    ) -> Dict[str, Any]:
        """Constructs input from mix & sources

        Arguments:
            mix - numpy array representing signal
            sources - numpy

        Returns:
            [tuple] -- (log_spec, stft, n). log_spec contains the
            log_spectrogram, stft contains the complex spectrogram, and n is the
            original length of the audio signal (used for reconstruction).
        """


    def format_output(self, output):
        # [num_batch, sequence_length, num_frequencies*num_channels, ...], while
        # 'cnn' produces [num_batch, num_channels, num_frequencies,
        # sequence_length, ...]
        for key in self.targets:
            if self.options['format'] == 'rnn':
                _shape = output[key].shape
                shape = [_shape[0], _shape[1]*_shape[2]]
                if len(_shape) > 3:
                    shape += _shape[3:]
                output[key] = np.reshape(output[key], shape)
            elif self.options['format'] == 'cnn':
                axes_loc = [0, 3, 2, 1]
                output[key] = np.moveaxis(output[key], [0, 1, 2, 3], axes_loc)

        return output

    @staticmethod
    def transform(
        data: np.ndarray,
        n_fft: int,
        hop_length: int
    ) -> Tuple[np.ndarray, np.ndarray, int]:
        """Transforms multichannel audio signal into a multichannel spectrogram.

        Arguments:
            data - audio signal of shape (n_channels, n_samples)
            n_fft - number of FFT bins for each frame
            hop_length - hop between frames

        Returns:
            tuple of (log_spec, stft, n). log_spec contains the log_spectrogram,
            stft contains the complex spectrogram, and n is the original length
            of the audio signal (used for reconstruction).
        """

        n = data.shape[-1]
        data = librosa.util.fix_length(data, n + n_fft // 2, axis=-1)
        stft = np.stack(
            [
                librosa.stft(data[ch], n_fft=n_fft, hop_length=hop_length)
                for ch
                in range(data.shape[0])
            ],
            axis=-1,
        )
        log_spectrogram = librosa.amplitude_to_db(np.abs(stft), ref=np.max)
        return log_spectrogram, stft, n

    @staticmethod
    def whiten(data: np.ndarray) -> np.ndarray:
        """Whitens data

        Arguments:
            data - spectrogram w/ shape (n_channels, n_frequencies, n_samples)

        Returns:
            spectrogram w/ shape (n_channels, n_frequencies, n_samples) where
            each data point has been whitened
        """
        data -= data.mean()
        data /= data.std() + 1e-7
        return data

    @staticmethod
    def magnitude_weights(magnitude_spectrogram):
        """Whitens data

        Arguments:
            magnitude_spectrogram - spectrogram w/ shape
                (n_channels, n_frequencies, n_samples)

        Returns:
            weights matrix w/ shape (n_channels, n_frequencies, n_samples) where
            each data point reflects magnitude of spectrogram at that point and
            indicates relative importance of that point based on magnitude
        """
        weights = magnitude_spectrogram / (np.sum(magnitude_spectrogram))
        weights *= (
            magnitude_spectrogram.shape[0] * magnitude_spectrogram.shape[1]
        )
        return weights
