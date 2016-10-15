import nussl
import json
from separation_session import SeparationSession

if __name__ == '__main__':
    s = nussl.StftParams(44100)
    g = s.to_json()
    a = nussl.AudioSignal()
    e = a.to_json()
    sess = SeparationSession()
    # json.dumps(sess)
    b = sess.to_json()

    i = 0