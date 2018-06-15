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


def get_deep_clustering_model_path(model_type, base_path=None,
    model_prefix="deep_clustering_"):
    """Gets path to deep clustering model to load

    In the future with more varied models will want to return other metadata
    such as hidden_size & resample_rate

    Args:
        model_type - the type of model the user selected, e.g. `drums`, `vocals`
        base_path - path to directory containing models, current convention is
            `~/.nussl/models`
        model_prefix - prefix naming convention before model_type

    Returns:
        absolute path to deep clustering model
    """
    # essentially just an optional argument
    # must be set this way as optional parameter defaults cannot be function calls
    if base_path == None:
        base_path = os.path.expanduser(os.path.join('~', '.nussl', 'models'))

    model = "{}{}.model".format(model_prefix, model_type)
    return os.path.join(base_path, model)
