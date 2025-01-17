from flask import Flask, render_template, request, jsonify
from deep_translator import GoogleTranslator
from pypinyin import pinyin, Style
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)