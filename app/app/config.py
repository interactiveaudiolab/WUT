import os
basedir = os.path.abspath(os.path.dirname(__file__))


class Config(object):
    DEBUG = False
    TESTING = False
    CSRF_ENABLED = True
    SECRET_KEY = 'abcdefg1234567'


class ProductionConfig(Config):
    DEBUG = False


class StagingConfig(Config):
    DEVELOPMENT = True
    DEBUG = True


class DevelopmentConfig(Config):
    DEVELOPMENT = True
    DEBUG = True


class TestingConfig(Config):
    TESTING = True


UPLOAD_BASE_FOLDER = os.path.join('tmp')
UPLOAD_BASE_FOLDER = os.path.abspath(UPLOAD_BASE_FOLDER)
USER_AUDIO_FOLDER = os.path.join(UPLOAD_BASE_FOLDER, 'user_audio')
USER_AUDIO_ORIGINAL_FOLDER_NAME = 'original_files'
USER_AUDIO_CONVERTED_FOLDER_NAME = 'converted_files'

INIT_FOLDERS = [UPLOAD_BASE_FOLDER, USER_AUDIO_FOLDER]

ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'aif'}

HOST = '0.0.0.0'