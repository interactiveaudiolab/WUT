import nussl
# import json
# from separation_session import SeparationSession

if __name__ == '__main__':
    a = nussl.AudioSignal('tmp/toy_audio/never-catch-me.mp3')
    a.stft()
    i = 0