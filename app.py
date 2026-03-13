from flask import Flask, request, jsonify
from flask_cors import CORS
from anthropic import Anthropic
import os
from dotenv import load_dotenv
import json
import re

load_dotenv()

app = Flask(__name__)

# CORS: production'da frontend URL'ini FRONTEND_URL env variable'ından al
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
CORS(app, resources={r"/*": {"origins": [frontend_url, "http://localhost:3000"]}})

# API key kontrolü
api_key = os.getenv('ANTHROPIC_API_KEY')
if not api_key:
    print("ANTHROPIC_API_KEY bulunamadı! .env dosyasını kontrol edin.")
else:
    print(f"API Key yüklendi: {api_key[:12]}...")

client = Anthropic(api_key=api_key)

SYSTEM_PROMPT = """Sen bir sosyal medya linç simülatörüsün. Kullanıcının mental dayanıklılığını test ediyorsun.
Cevapların SADECE istenen formatta olmalı. Markdown bloğu kullanma, sadece düz JSON veya düz text döndür."""


def extract_json(text):
    """3 katmanlı JSON parsing: direkt → markdown strip → regex"""
    # 1. Direkt parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Markdown strip
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 3. Regex — ilk { ... } bloğunu bul
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"JSON parse edilemedi: {text[:200]}")


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "alive"})


@app.route('/generate-linc', methods=['POST'])
def generate_linc():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Boş request"}), 400

        action = data.get('action', 'initial')

        if action not in ('initial', 'reply', 'analyze'):
            return jsonify({"error": f"Bilinmeyen action: {action}"}), 400

        if action == 'initial':
            statement = data.get('statement', '').strip()
            if not statement:
                return jsonify({"error": "Statement boş olamaz"}), 400

            prompt = f"""Kullanıcı şunu paylaştı: "{statement}"

Bu paylaşıma gelebilecek 5 farklı olumsuz/eleştirel yorum üret. Her biri kısa olsun (1-2 cümle).

Sosyal medyada insanlar:
- Alakasız detaylardan yola çıkarak eleştirir
- Mantıksız bağlantılar kurar
- Kişisel eleştirilerde bulunur
- Yazım hatalarını bahane eder
- Tamamen konuyla alakasız eleştiriler yapar

SADECE JSON döndür:
{{"yorumlar": [{{"id": 1, "text": "eleştiri 1"}}, {{"id": 2, "text": "eleştiri 2"}}, {{"id": 3, "text": "eleştiri 3"}}, {{"id": 4, "text": "eleştiri 4"}}, {{"id": 5, "text": "eleştiri 5"}}]}}

Yorumlar Twitter, Reddit, Ekşi Sözlük'teki gerçek davranışları yansıtsın."""

        elif action == 'reply':
            linc_text = data.get('linc_text', '').strip()
            user_reply = data.get('user_reply', '').strip()
            if not linc_text or not user_reply:
                return jsonify({"error": "linc_text ve user_reply gerekli"}), 400

            prompt = f"""Önceki eleştiri: "{linc_text}"
Kullanıcı cevabı: "{user_reply}"

Bu cevaba 1 cümlelik eleştirel yanıt ver. Sadece yanıt metnini döndür, başka bir şey yazma."""

        elif action == 'analyze':
            conversation = data.get('conversation', [])
            if not conversation:
                return jsonify({"error": "Conversation boş olamaz"}), 400

            prompt = f"""Şu etkileşimi analiz et:

{format_conversation(conversation)}

İki tarafın da durumunu analiz et.

SADECE JSON döndür:
{{"kullanici_durum": "analiz", "elestiren_durum": "analiz", "genel": "değerlendirme"}}"""

        # API çağrısı
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text
        print(f"CLAUDE CEVABI: {response_text[:200]}")

        if action in ('initial', 'analyze'):
            result = extract_json(response_text)
            return jsonify(result)
        else:
            return jsonify({"response": response_text})

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"HATA: {error_detail}")
        return jsonify({"error": str(e)}), 500


def format_conversation(conversation):
    formatted = []
    for item in conversation:
        formatted.append(f"{item['role']}: {item['text']}")
    return "\n".join(formatted)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    debug = os.getenv('FLASK_ENV') != 'production'
    print(f"linçmatik backend çalışıyor — port {port}")
    app.run(debug=debug, host='0.0.0.0', port=port)
