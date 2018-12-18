import os


def safe_makedirs(path):
    try:
        os.makedirs(os.path.abspath(path))

    except OSError as e:
        if e.errno == 17:  # file exists
            return
        else:
            raise e
