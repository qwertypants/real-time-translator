from flask import Flask, render_template, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

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
            return jsonify({'translation': ''})

        # Convert 'zh' to 'zh-CN' for simplified Chinese
        # and 'zh-TW' remains as is for traditional Chinese
        if target_lang == 'zh':
            target_lang = 'zh-CN'

        # Perform translation using deep_translator
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translation = translator.translate(text)

        return jsonify({
            'translation': translation,
            'source_text': text
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)