from flask import Flask, render_template, request, jsonify, send_file, url_for, redirect
from deep_translator import GoogleTranslator
from pypinyin import pinyin, Style
from gtts import gTTS
import os
import tempfile
import re
import sqlite3
from datetime import datetime
import uuid

app = Flask(__name__)

# Database initialization
def init_db():
    conn = sqlite3.connect('translations.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS translations
        (id TEXT PRIMARY KEY,
         source_text TEXT NOT NULL,
         translation TEXT NOT NULL,
         pronunciation TEXT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
    ''')
    conn.commit()
    conn.close()

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
    # Get share_id from query parameters
    share_id = request.args.get('share')
    if share_id:
        conn = sqlite3.connect('translations.db')
        c = conn.cursor()
        c.execute('SELECT source_text, translation, pronunciation FROM translations WHERE id = ?', (share_id,))
        result = c.fetchone()
        conn.close()

        if result:
            return render_template('index.html', shared_data={
                'source_text': result[0],
                'translation': result[1],
                'pronunciation': result[2]
            })

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

@app.route('/share', methods=['POST'])
def share():
    try:
        data = request.get_json()
        source_text = data.get('source_text', '')
        translation = data.get('translation', '')
        pronunciation = data.get('pronunciation', '')

        if not source_text or not translation:
            return jsonify({'error': 'Missing required data'}), 400

        # Generate unique ID for the share
        share_id = str(uuid.uuid4())[:8]

        conn = sqlite3.connect('translations.db')
        c = conn.cursor()
        c.execute('INSERT INTO translations (id, source_text, translation, pronunciation) VALUES (?, ?, ?, ?)',
                 (share_id, source_text, translation, pronunciation))
        conn.commit()
        conn.close()

        share_url = url_for('index', share=share_id, _external=True)
        return jsonify({'share_url': share_url})
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

# Initialize database when the app starts
init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)