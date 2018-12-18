import os

SECRET_KEY = 'abcdefg1234567'
UPLOAD_BASE_FOLDER = os.path.abspath(os.path.join('tmp'))
USER_AUDIO_FOLDER = os.path.join(UPLOAD_BASE_FOLDER, 'user_audio')
USER_AUDIO_ORIGINAL_FOLDER_NAME = 'original_files'
USER_AUDIO_CONVERTED_FOLDER_NAME = 'converted_files'

INIT_FOLDERS = [UPLOAD_BASE_FOLDER, USER_AUDIO_FOLDER]

ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'aif'}

HOST = '0.0.0.0'

REDIS_URL = "redis://:@localhost:6379/0"
