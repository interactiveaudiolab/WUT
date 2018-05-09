let audioUploadModal = new Modal('audio-upload-modal', 'modal-active',
'audio-upload-modal-active', 'modal-cover', 'modal-ready',
'audio-upload-modal-open', 'audio-upload-modal-close')

let uncheckCheckboxes = (checkboxClass) =>
  Array.from(document.getElementsByClassName(checkboxClass)).
    forEach(elem => elem.checked = false);

let cleaner = () => {
  // checkboxes
  uncheckCheckboxes('separation-check');
  document.getElementById('audio-upload-modal-back').click();

  // audio
  if(recorder && recorder.state === 'recording') recorder.stop();
  document.getElementById('audio-upload-modal-record').classList.remove('audio-upload-modal-record-on')
  document.getElementById('audio-upload-modal-record').classList.add('audio-upload-modal-record-off')
  document.getElementById('audio-upload-modal-final').src = '';
  document.getElementById('audio-upload-modal-results').setAttribute('style', 'visibility: hidden;')

  // buttons - only adds if not already disabled
  document.getElementById('audio-upload-modal-next').classList.add('disabled')
  document.getElementById('audio-upload-modal-begin').classList.add('disabled')
}

audioUploadModal.addOnHideCleaner(cleaner)

let transitions = [{
  target: 'audio-upload-modal-next',
  hide: ['audio-upload-modal-separation'],
  show: [['audio-upload-modal-audio', 'display: flex;'], ['audio-upload-modal-back', 'visibility: visible;']]
}, {
  target: 'audio-upload-modal-back',
  hide: ['audio-upload-modal-audio'],
  show: [['audio-upload-modal-separation', 'display: flex;'], ['audio-upload-modal-back', 'visibility: hidden;']]
}]

audioUploadModal.setNaivePageTransitions(transitions)

// checkboxes

// enable/disable next on checkboxes
let boxes = Array.from(document.getElementsByClassName('separation-check'));
boxes.forEach(function(element) {
  element.addEventListener('click', () => {
      if(boxes.some(elem => elem.checked)) {
          document.getElementById('audio-upload-modal-next').classList.remove('disabled')
      } else {
          document.getElementById('audio-upload-modal-next').classList.add('disabled')
      }
  });
});

// get values of all checked boxes of a particular class
let getCheckedValues = function(checkboxClass) {
  return Array.from(document.getElementsByClassName(checkboxClass)).
      filter(elem => elem.checked).map(elem => elem.value);
}

// on begin
document.getElementById('audio-upload-modal-begin').addEventListener('click', event => {
  if(!event.currentTarget.classList.contains('disabled')) {
      audioUploadModal.hide(true);

      // send checkboxes + audio to server
      // leave to specific implementations
      let checks = getCheckedValues('separation-check');
      upload_to_server(audio_file, checks);

      // pca.clearSelections();
      mixture_waveform.load(URL.createObjectURL(audio_file));
      // masked_waveform.clearSurfer()
      // inverse_waveform.clearSurfer()
      // UI
      $('.shared-spectrogram-spinner').hide();
      $('#spectrogram-spinner').show();

      $('.shared-plots-spinner').hide();
      $('#plots-spinner').show();
      $('#plots-spinner').css('display', 'flex');

      // clean once data no longer needed
      audioUploadModal.clean()
  }
})

function upload_to_server(file, checks) {
  file_with_metadata = {
      'file_name': file.name,
      'file_size': file.size,
      'file_type': file.type,
      'file_data': file
  };

  socket.compress(true).emit('audio_upload', {
      'audio_file': file_with_metadata,
      'selections': checks
  });
}


// on file upload

document.getElementById('audio-upload-modal-upload').addEventListener('click',
  () => {
      for(let waveform of audio.waveforms) {
          if(waveform && waveform.surfer.backend.buffer && waveform.surfer.isPlaying()) {
              waveform.pause();
          }
      }

      document.getElementById('audio-upload-modal-upload-input').click()
  });

document.getElementById('audio-upload-modal-upload-input').
  addEventListener('change',function () {
      // if user clicks upload but then cancels
      if(this.files.length == 0) { return; }

      let url = URL.createObjectURL(this.files[0]);
      document.getElementById('audio-upload-modal-final').src = url;
      document.getElementById('audio-upload-modal-results').setAttribute('style', 'visibility: visible;')
      document.getElementById('audio-upload-modal-begin').classList.remove('disabled');
      audio_file = this.files[0];
});

// on recording finish
// must be a way to avoid global recorder here (maybe context too?)
var recorder;
var blob;
var audio_file;

document.getElementById('audio-upload-modal-record').addEventListener('click', function(event){
  let toggle = (elem) => {
      elem.classList.toggle('audio-upload-modal-record-on');
      elem.classList.toggle('audio-upload-modal-record-off');
  }

  toggle(event.currentTarget)

  if(event.currentTarget.classList.contains('audio-upload-modal-record-on')) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
          recorder = new MediaRecorder(stream);
          document.getElementById('audio-upload-modal-begin').classList.add('disabled');

          recorder.ondataavailable = e => {
              // triggered when stop action fired on recorder
              // after user clicks on record button again
              if(recorder.state == 'inactive') {
                  document.getElementById('audio-upload-modal-final').src = URL.createObjectURL(e.data);
                  document.getElementById('audio-upload-modal-results').setAttribute('style', 'visibility: visible;');

                  // back-end only
                  blob = e.data;
                  mediaRecorderBlobToWavFile(blob)
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
          let file = new File([wav], 'test.wav', {
              type: 'audio/wav', lastModified: Date.now()
          });

          // solely back-end no need to present to user
          // log for development purposes
          audio_file = file;
          document.getElementById('audio-upload-modal-begin').classList.remove('disabled');
      }
  )};

  fileReader.readAsArrayBuffer(blob);
}
