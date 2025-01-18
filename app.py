from flask import Flask, render_template, request, jsonify, send_file
from deep_translator import GoogleTranslator
from pypinyin import pinyin, Style
from gtts import gTTS
import os
import tempfile
import re

app = Flask(__name__)

def add_pinyin(text):
    # Generate pinyin with tone marks
    pinyins = pinyin(text, style=Style.TONE)
    return ' '.join([p[0] for p in pinyins])

def generate_pronunciation(text, is_traditional):
    if not text:
        return ''

    # For traditional Chinese, we'll use bopomofo style
    if is_traditional:
        pinyins = pinyin(text, style=Style.BOPOMOFO)
    else:
        pinyins = pinyin(text, style=Style.TONE)

    return ' '.join([p[0] for p in pinyins])

def generate_audio(text, lang='zh-cn'):
    # Create a temporary file for the audio
    temp_file = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
    tts = gTTS(text=text, lang=lang)
    tts.save(temp_file.name)
    return temp_file.name

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        text = data.get('text', '')
        source_lang = data.get('source', 'en')
        target_lang = data.get('target', 'zh')

        if not text:
            return jsonify({'translation': '', 'pronunciation': ''})

        # Convert 'zh' to 'zh-CN' for simplified Chinese
        # and 'zh-TW' remains as is for traditional Chinese
        is_traditional = target_lang == 'zh-TW'
        translator_target = target_lang if is_traditional else 'zh-CN'

        # Perform translation using deep_translator
        translator = GoogleTranslator(source=source_lang, target=translator_target)
        translation = translator.translate(text)

        # Generate pronunciation guide
        pronunciation = generate_pronunciation(translation, is_traditional)

        return jsonify({
            'translation': translation,
            'pronunciation': pronunciation,
            'source_text': text
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/speak', methods=['POST'])
def speak():
    try:
        data = request.get_json()
        text = data.get('text', '')
        lang = data.get('lang', 'en')

        # Generate audio file
        audio_file = generate_audio(text, lang)

        # Send the file and then clean up
        response = send_file(
            audio_file,
            mimetype='audio/mpeg'
        )

        # Delete the temporary file after sending
        @response.call_on_close
        def cleanup():
            os.unlink(audio_file)

        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)