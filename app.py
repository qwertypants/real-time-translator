from flask import Flask, render_template, request, jsonify
import requests

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

        # Use LibreTranslate API
        response = requests.post(
            'https://translate.argosopentech.com/translate',
            json={
                'q': text,
                'source': source_lang,
                'target': target_lang
            }
        )

        if response.status_code == 200:
            translation = response.json()['translatedText']
            return jsonify({
                'translation': translation,
                'source_text': text
            })
        else:
            return jsonify({'error': 'Translation service error'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)