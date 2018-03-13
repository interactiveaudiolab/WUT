var all_waveforms = [mixture_waveform, masked_waveform, inverse_waveform];
var spectrogram = new ScatterSpectrogram('spectrogram');
var pca = new PCAHeatmap('pca');
pca.addLinkedSpectrogram(spectrogram)
var socket;

var whiteLine = 'rgba(245, 245, 245, 1)';
var whiteFill = 'rgba(255, 255, 255, 0.35)';
var greenLine = 'rgba(0, 255, 0, 1)';
var greenFill = 'rgba(0, 255, 0, 0.35)';

var colorDict = {'white': {'line': whiteLine, 'fill': whiteFill },
                 'green': {'line': greenLine, 'fill': greenFill } };

var surferOptions = {
    container: '#mixture-waveform',
    waveColor: 'grey',
    progressColor: 'black',
    cursorColor: 'pink',
    scrollParent: false,
    height: 80,
    normalize: true,
    audioRate: 1.0,
    minPxPerSec: 0,
    responsive: true
};

var mixture_waveform = new Waveform('#mixture-waveform', '#mixture-play', '#mixture-stop')
var masked_waveform = new Waveform('#masked-waveform', '#masked-play', '#masked-stop', '#masked-spinner')
var inverse_waveform = new Waveform('#inverse-waveform', '#inverse-play', '#inverse-stop', '#inverse-spinner')

pcaMatrixToHistogram = (pca) => {
    return pca.map(row => row.map(inds => Math.log(inds.length + 1)))
}

var currTime = () => {
    let time = new Date();
    return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds()
}

$(document).ready(function() {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	online = new AudioContext();

	context = online;

  socket_namespace = '/wut';
  socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + socket_namespace);

  socket.on('connect', function() {
      console.log('Socket connected.');
  });

  socket.on('bad_file', function () {
      console.log('File rejected by server');
  });

  socket.on('pca', function(message) {
    indices = JSON.parse(message)

    pca.addTFIndices(indices);
    let hist = pcaMatrixToHistogram(pca.TFIndices)

    // pca of size 100 x 100
    make_pca(pca, hist, 100, 100)
  });

  socket.on('mel', function(message) {
    let spec_data = JSON.parse(message);
    spectrogram.dims = [spec_data.length, spec_data[0].length]

    // currently hardcoding in max mel freq
    let durationInSecs = mixture_waveform.surfer.backend.getDuration();
    getMelScatterSpectrogramAsImage(spectrogram, spectrogram.dims[1], durationInSecs, 150);
  });

  socket.on('masked_audio', function(message) {
    masked_waveform.load('./get_masked_audio?val=' + Math.random().toString(36).substring(7))
  });

  socket.on('inverse_audio', function(message) {
    inverse_waveform.load('./get_inverse_audio?val=' + Math.random().toString(36).substring(7))
  });
});

document.addEventListener('DOMContentLoaded', function () {
    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
});


function relayoutPlots() {
    Plotly.relayout(pca.divID, { width: pca.DOMObject.width() });
    Plotly.relayout(spectrogram.divID, { width: spectrogram.DOMObject.width() });
}

// RESIZE PLOTS ON WINDOW CHANGE
$(window).resize(relayoutPlots);

// ~~~~~~~~~~~~~ WAVEFORM ~~~~~~~~~~~~~

// resize with half second lag
// kills audio, could have it pick up where left off later
// also may want to write own debouncing function instead of
// importing Lodash for it
$(window).resize(_.debounce(function(){
    mixture_waveform.resizeWaveform();
    masked_waveform.resizeWaveform();
    inverse_waveform.resizeWaveform();
  }, 500));

//  ~~~~~~~~~~~~~ MODAL ~~~~~~~~~~~~~

$('#upload').click(function(){
    $('#open-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
    openFileDialog();
});

$('#open-button-modal').click(function () {
    openFileDialog();
});

function openFileDialog() {
    audio.import_audio();
}

//  ~~~~~~~~~~~~~ Apply Selections button ~~~~~~~~~~~~~

$('#apply-selections').click(function(){
    // probably a better way to check this in the future
    if(!$('#apply-selections').hasClass('disabled')) {
        masked_waveform.setLoading(true);
        inverse_waveform.setLoading(true);

        socket.emit('mask', { mask: spectrogram.exportSelectionMask() });
    }
});


// MODAL
// move to own file later
// adapted from https://github.com/hakimel/Avgrund
class Avgrund {
    constructor(modal, cover, active, ready, open, close) {
      document.getElementById(open).addEventListener('click', () => this.show())
      document.getElementById(close, '#').addEventListener('click', () => this.hide())

      this.container = document.body;
      this.modal = document.getElementById(modal);
      this.cover = document.querySelector(this._makeSelector(cover, '.'));
      this.active = active;

      this.container.classList.add(ready);

      // listeners below added on show
      // hide on esc
      this.onKeyUp = (event) => { if(event.keyCode === 27) { this.hide(); } }
      // hide on click outside
      this.onClick = (event) => { if(event.target === this.cover) { this.hide(); } }
    }

    show() {
      this._setListeners(true)
      this.container.classList.add(this.active);
      }

    hide(dontClean) {
      this._setListeners(false)
      this.container.classList.remove(this.active);

      // cleaner removes unwanted state on modal (such as checked checkboxes)
      if(!dontClean && this.onHideCleaner) { this.onHideCleaner() }
    }

    // add function to perform cleanup (such as unchecking checkboxes) on hide
    addOnHideCleaner(cleaner) { this.onHideCleaner = cleaner; }

    // allow user to specify a series of click targets
    // and elements to hide/show with those targets
    // input format: listof objects with target, hide and show fields
    // [{ target: 'id', hide: [listof ids], show: [listof [ids, display_style]] }, ...]
    setNaivePageTransitions(path) {
      for (let { target, hide, show } of path) {
        let targElem = document.getElementById(target);
        targElem.addEventListener('click', () => {
          if(!targElem.classList.contains('disabled')) {
            for(let h of hide) { document.getElementById(h).setAttribute('style', 'display: none;') }
            for(let [s, styl] of show) { document.getElementById(s).setAttribute('style', styl) }
          }
        })
      }
    }

    _setListeners(active) {
      if(active) {
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('click', this.onClick);
        document.addEventListener('touchstart', this.onClick);
      } else {
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('click', this.onClick);
        document.removeEventListener('touchstart', this.onClick);
      }
    }

    _makeSelector(clss, pref) { return clss[0] === pref ? clss : `${pref}${clss}` }
}

let grund = new Avgrund('modal', 'avgrund-cover', 'avgrund-active',
'avgrund-ready', 'modal-open', 'modal-close')

let uncheckCheckboxes = function(checkboxClass) {
Array.from(document.getElementsByClassName(checkboxClass)).
    forEach(elem => elem.checked = false);
}

let cleaner = () => {
    // checkboxes
    uncheckCheckboxes('separation-check');
    document.getElementById('modal-back').click();

    // audio
    if(recorder && recorder.state === 'recording') recorder.stop();
    document.getElementById('modal-record').classList.remove('modal-record-on')
    document.getElementById('modal-record').classList.add('modal-record-off')
    document.getElementById('modal-final-audio').src = '';
    document.getElementById('modal-results').setAttribute('style', 'visibility: hidden;')

    // buttons - only adds if not already disabled
    document.getElementById('modal-next').classList.add('disabled')
    document.getElementById('modal-begin').classList.add('disabled')
}

grund.addOnHideCleaner(cleaner)

let transitions = [{
    target: 'modal-next',
    hide: ['modal-separation'],
    show: [['modal-audio', 'display: flex;'], ['modal-back', 'visibility: visible;']]
}, {
    target: 'modal-back',
    hide: ['modal-audio'],
    show: [['modal-separation', 'display: flex;'], ['modal-back', 'visibility: hidden;']]
}]

grund.setNaivePageTransitions(transitions)

// checkboxes

// enable/disable next on checkboxes
let boxes = Array.from(document.getElementsByClassName('separation-check'));
boxes.forEach(function(element) {
    element.addEventListener('click', () => {
        if(boxes.some(elem => elem.checked)) {
            document.getElementById('modal-next').classList.remove('disabled')
        } else {
            document.getElementById('modal-next').classList.add('disabled')
        }
    });
});

// get values of all checked boxes of a particular class
let getCheckedValues = function(checkboxClass) {
    return Array.from(document.getElementsByClassName(checkboxClass)).
        filter(elem => elem.checked).map(elem => elem.value);
}

// on begin
document.getElementById('modal-begin').addEventListener('click', event => {
    if(!event.currentTarget.classList.contains('disabled')) {
        grund.hide(true);

        // send checkboxes + audio to server
        // leave to specific implementations
        }
})

// on file upload

document.getElementById('modal-upload').addEventListener('click',
    () => document.getElementById('modal-upload-audio-input').click())

document.getElementById('modal-upload-audio-input').
    addEventListener('change',function () {
        // if user clicks upload but then cancels
        if(this.files.length == 0) { return; }

        let url = URL.createObjectURL(this.files[0]);
        document.getElementById('modal-final-audio').src = url;
        document.getElementById('modal-results').setAttribute('style', 'visibility: visible;')
        document.getElementById('modal-begin').classList.remove('disabled');
});

// on recording finish
// must be a way to avoid global recorder here (maybe context too?)
var recorder;
var context = new AudioContext();

document.getElementById('modal-record').addEventListener('click', function(event){
    let toggle = (elem) => {
        elem.classList.toggle('modal-record-on');
        elem.classList.toggle('modal-record-off');
    }

    toggle(event.currentTarget)

    if(event.currentTarget.classList.contains('modal-record-on')) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
        recorder = new MediaRecorder(stream);
        document.getElementById('modal-begin').classList.add('disabled');

        recorder.ondataavailable = e => {
            // triggered when stop action fired on recorder
            // after user clicks on record button again
            if(recorder.state == 'inactive') {
            document.getElementById('modal-final-audio').src = URL.createObjectURL(e.data);
            document.getElementById('modal-results').setAttribute('style', 'visibility: visible;');
            document.getElementById('modal-begin').classList.remove('disabled');

            // back-end only
            mediaRecorderBlobToWavFile(e.data)
            }
        };

        recorder.start();
        })
    } else { if(recorder) { recorder.stop(); } }
});

// in future make more abstract
// also almost definitely a better way to do this
function mediaRecorderBlobToWavFile(blob) {
    var fileReader = new FileReader();
    // load array buffer from blob
    fileReader.onload = function() {
        // once loaded, convert to audio buffer
        context.decodeAudioData(this.result).then(
        // then convert to wav blob
        buffer => {
        let wav = bufferToWave(buffer, 0.0, buffer.length)
        let file = new File([wav], 'test.mp3', {
            type: 'audio/wav', lastModified: Date.now()
        });

        // solely back-end no need to present to user
        // log for development purposes
        console.log(file)
        }
    )};

    fileReader.readAsArrayBuffer(blob);
}

// FROM: https://stackoverflow.com/a/30045041
// Convert a audio-buffer segment to a Blob using WAVE representation
// come back to this, there must be a cleaner way
function bufferToWave(abuffer, offset, len) {
    var numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this demo)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for(i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while(pos < length) {
        for(i = 0; i < numOfChan; i++) {             // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true);          // update data chunk
        pos += 2;
        }
        offset++                                     // next source sample
    }

    // create Blob
    return new Blob([buffer], {type: "audio/wav"});

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}