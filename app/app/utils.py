import os


def safe_makedirs(path):
    try:
        path = os.path.abspath(path)
        os.makedirs(path)

    except OSError as e:
        if e.errno == 17:  # File exists
            return
        else:
            raise e


def trunc(f):
    return float("{0:.2f}".format(f))