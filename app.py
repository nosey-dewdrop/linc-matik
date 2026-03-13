from flask import Flask, request, jsonify
from flask_cors import CORS
from anthropic import Anthropic
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

@app.route('/health', methods=['GET'])
def health():
      return jsonify({"status": "alive"})

            
@app.route('/generate-linc', methods=['POST'])
def generate_linc():
    try:
        data = request.json
        action = data.get('action', 'initial')  # initial, reply, analyze
        
        if action == 'initial':
                  # İlk mesaj - 5 linç üret
            statement = data.get('statement', '')
            
            prompt = f"""Kullanıcı şunu paylaştı: "{statement}"

            Bu paylaşıma gelebilecek 5 farklı olumsuz/eleştirel yorum üret. Her biri kısa olsun (1-2 cümle). 
            Senin yardım edeceğin nokta, internette benzer durumlara verilen tepkileri simüle etmen. 
            Böylece insanların yorumlarına hazırlıklı olacağım. Benim karate öğretmenimsin. Beni olan kötü yorumlara karşı hazırlıyorsun...

            Sosyal medyada insanlar:
            - Alakasız detaylardan yola çıkarak eleştirir.
            - Mantıksız bağlantılar kurar 
            - Kişisel eleştirilerde bulunur
            - Yazım hatalarını bahane eder
            - Tamamen konuyla alakasız eleştiriler yapar

            SADECE JSON döndür:
            {{
            "yorumlar": [
            {{"id": 1, "text": "eleştiri 1"}},
            {{"id": 2, "text": "eleştiri 2"}},
            {{"id": 3, "text": "eleştiri 3"}},
            {{"id": 4, "text": "eleştiri 4"}},
            {{"id": 5, "text": "eleştiri 5"}}
            ]
            }}
            ÖNEMLİ:
            Yorumlar Twitter, Reddit, Ekşi Sözlük'teki gerçek davranışları yansıtsın. 
            İnsanlar mantıksız ve alakasız eleştiriler yapabilir.
            """

        elif action == 'reply':
            # Bir linçe cevap ver
            linc_text = data.get('linc_text', '')
            user_reply = data.get('user_reply', '')
            
            prompt = f"""Önceki eleştiri: "{linc_text}"
Kullanıcı cevabı: "{user_reply}"

Bu cevaba 1 cümlelik eleştirel yanıt ver. Sadece yanıt metnini döndür, başka bir şey yazma."""

        elif action == 'analyze':
            # Tüm konuşmayı analiz et
            conversation = data.get('conversation', [])
            
            prompt = f"""Şu etkileşimi analiz et:

{format_conversation(conversation)}

İki tarafın da durumunu analiz et.

SADECE JSON döndür:
{{
  "kullanici_durum": "analiz",
  "elestiren_durum": "analiz",
  "genel": "değerlendirme"
}}"""

        # API çağrısı
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text
        print("🟢 CLAUDE'UN CEVABI:")
        print(response_text)
        print("=" * 50)
        
        # Markdown temizle
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()
        
        if action == 'initial' or action == 'analyze':
            result = json.loads(response_text)
            return jsonify(result)
        else:
            # Reply - direkt text
            return jsonify({"response": response_text})
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print("🔴 HATA DETAYI:")
        print(error_detail)
        return jsonify({"error": str(e)}), 500

def format_conversation(conversation):
    """Konuşmayı formatla"""
    formatted = []
    for item in conversation:
        formatted.append(f"{item['role']}: {item['text']}")
    return "\n".join(formatted)



if __name__ == '__main__':
    print("linç-matik backend çalışıyor")
    print("📍 http://localhost:5002")
    app.run(debug=True, port=5002)