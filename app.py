from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
import re
import time
import random
from collections import defaultdict

load_dotenv()

app = Flask(__name__)

# CORS
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
CORS(app, resources={r"/*": {"origins": [frontend_url, "http://localhost:3000", "http://localhost:3001"]}})

# ═══ GROQ (reply + analiz icin) ═══
groq_key = os.getenv('GROQ_API_KEY')
groq_client = None
if groq_key:
    from groq import Groq
    groq_client = Groq(api_key=groq_key)
    print(f"groq api key yuklendi: {groq_key[:12]}...")
else:
    print("GROQ_API_KEY bulunamadi — reply ve analiz calisMAYACAK")

# ═══ DATASET ═══
DATASET_PATH = os.path.join(os.path.dirname(__file__), 'yorumlar.json')
dataset = {"templates": [], "generic": []}

def load_dataset():
    global dataset
    try:
        with open(DATASET_PATH, 'r', encoding='utf-8') as f:
            dataset = json.load(f)
        print(f"dataset yuklendi: {len(dataset['templates'])} template, {len(dataset['generic'])} generic")
    except Exception as e:
        print(f"dataset yuklenemedi: {e}")

load_dataset()

PERSONA_MAP = {
    "toxic_teyze": 0,
    "keyboard_warrior": 1,
    "moral_bekcisi": 2,
    "hakli_hasan": 3,
    "bilmis_burcu": 4,
}

SYSTEM_PROMPT = """Sen sosyal medyadaki en zehirli yorumcularin beynisin. Twitter, Eksi Sozluk, Reddit'teki en aci, en kirici ama zeki yorumlari yaziyorsun.
Amacin kullanicinin mental dayanikliligini test etmek. Yumusak olma, seni seven insanlara degil sana saldiran insanlara benzeyen yorumlar yaz.
Turkce yaz, sokak dili kullan, kisa ve keskin ol. Markdown kullanma, sadece duz text veya JSON."""


# ═══ RATE LIMITING ═══
IP_REQUESTS = defaultdict(list)
DAILY_COUNT = {"count": 0, "date": None}
RATE_PER_MINUTE = 10
DAILY_LIMIT = 500


def check_rate_limit(ip):
    now = time.time()
    today = time.strftime("%Y-%m-%d")

    if DAILY_COUNT["date"] != today:
        DAILY_COUNT["count"] = 0
        DAILY_COUNT["date"] = today

    if DAILY_COUNT["count"] >= DAILY_LIMIT:
        return False, "gunluk limit doldu, yarin tekrar dene"

    IP_REQUESTS[ip] = [t for t in IP_REQUESTS[ip] if now - t < 60]
    if len(IP_REQUESTS[ip]) >= RATE_PER_MINUTE:
        return False, "cok hizlisin, biraz bekle"

    IP_REQUESTS[ip].append(now)
    DAILY_COUNT["count"] += 1
    return True, ""


def generate_comments_from_dataset(statement):
    """dataset'ten 5 yorum sec, {konu} placeholder'ini statement ile degistir"""
    categories = ["kisisel_saldiri", "keyboard_warrior", "moral_bekcisi", "hakli_elestiri", "bilmis_birisi"]
    yorumlar = []

    # konu icin kisa bir ozet cikar (ilk 60 karakter)
    konu = statement[:60].strip()
    if len(statement) > 60:
        konu = konu.rsplit(' ', 1)[0] + "..."

    for i, cat in enumerate(categories):
        # bu kategoriden template'leri filtrele
        cat_templates = [t for t in dataset.get("templates", []) if t["category"] == cat]
        cat_generics = [t for t in dataset.get("generic", []) if t["category"] == cat]

        # %70 template, %30 generic tercih et
        if cat_templates and (random.random() < 0.7 or not cat_generics):
            chosen = random.choice(cat_templates)
            text = chosen["text"].replace("{konu}", konu)
        elif cat_generics:
            chosen = random.choice(cat_generics)
            text = chosen["text"]
        else:
            text = f"ya bunu da paylasmazsin be, {konu} hakkinda ne biliyorsun ki"

        yorumlar.append({"id": i + 1, "text": text})

    random.shuffle(yorumlar)
    # id'leri yeniden ata
    for idx, y in enumerate(yorumlar):
        y["id"] = idx + 1

    return yorumlar


def groq_chat(prompt, system=SYSTEM_PROMPT, max_tokens=600):
    """groq api ile chat completion"""
    if not groq_client:
        raise ValueError("groq api key ayarlanmamis")

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.85,
    )
    return response.choices[0].message.content


def extract_json(text):
    """3 katmanli JSON parsing"""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

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

    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"json parse edilemedi: {text[:200]}")


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "alive",
        "dataset": len(dataset.get("templates", [])) + len(dataset.get("generic", [])),
        "groq": groq_client is not None,
    })


@app.route('/generate-linc', methods=['POST'])
def generate_linc():
    try:
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        allowed, msg = check_rate_limit(ip)
        if not allowed:
            return jsonify({"error": msg}), 429

        data = request.json
        if not data:
            return jsonify({"error": "bos request"}), 400

        action = data.get('action', 'initial')

        if action not in ('initial', 'reply', 'analyze'):
            return jsonify({"error": f"bilinmeyen action: {action}"}), 400

        # ═══ INITIAL: groq ile yorum uret ═══
        if action == 'initial':
            statement = data.get('statement', '').strip()
            if not statement or len(statement) > 1000:
                return jsonify({"error": "statement bos veya cok uzun (max 1000)"}), 400

            prompt = f"""Kullanici sosyal medyada su paylasimi yapti:
"{statement}"

Simdi bu paylasimin ICERIGINE ozel 5 farkli linc yorumu yaz. Yorumlar:
- Paylasimda ne dedigini OKUMUS ve ona ozel saldiran insanlar olsun
- Kullanicinin soyledigi seyin icindeki mantik hatalarini, celiskileri, zayif noktalarini bulsunlar
- Kisisel olsun — "sen kimsin ki bunu diyorsun" tarzi
- Bazi yorumlar hakli gibi gorunen ama aslinda kirici olsun
- Bazilari direkt saldirgan olsun
- Her yorum 1-2 cumle, turkce, gunluk konusma dili

ONEMLI: Genel/generic yorumlar YAZMA. Her yorum direkt bu paylasimin icerigiyle ilgili olmali.

SADECE JSON dondur:
{{"yorumlar": [{{"id": 1, "text": "yorum"}}, {{"id": 2, "text": "yorum"}}, {{"id": 3, "text": "yorum"}}, {{"id": 4, "text": "yorum"}}, {{"id": 5, "text": "yorum"}}]}}"""

            response_text = groq_chat(prompt, max_tokens=600)
            result = extract_json(response_text)
            return jsonify(result)

        # ═══ REPLY: groq ile cevap ═══
        elif action == 'reply':
            linc_text = data.get('linc_text', '').strip()
            user_reply = data.get('user_reply', '').strip()
            if not linc_text or not user_reply:
                return jsonify({"error": "linc_text ve user_reply gerekli"}), 400
            if len(user_reply) > 500:
                return jsonify({"error": "cevap cok uzun (max 500)"}), 400

            prompt = f"""Onceki elestiri: "{linc_text}"
Kullanici cevabi: "{user_reply}"

Bu cevaba sosyal medya tarzinda 1 cumlelik keskin ve elestrel yanit ver.
Gercek bir internet trollu gibi yaz. Sadece yanit metnini dondur."""

            response_text = groq_chat(prompt, max_tokens=200)
            return jsonify({"response": response_text.strip()})

        # ═══ ANALYZE: groq ile analiz ═══
        elif action == 'analyze':
            conversation = data.get('conversation', [])
            if not conversation:
                return jsonify({"error": "conversation bos olamaz"}), 400

            formatted = "\n".join(f"{item['role']}: {item['text']}" for item in conversation)

            prompt = f"""Su etkilesimi analiz et:

{formatted}

Iki tarafin da durumunu analiz et. Psikolojik acidan degerlendirme yap.

SADECE JSON dondur:
{{"kullanici_durum": "kullanicinin tutumu ve durumu hakkinda 2-3 cumle analiz", "elestiren_durum": "elestirenin motivasyonu hakkinda 2-3 cumle analiz", "genel": "genel degerlendirme ve tavsiye, 2-3 cumle"}}"""

            response_text = groq_chat(prompt, max_tokens=500)
            result = extract_json(response_text)
            return jsonify(result)

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"HATA: {error_detail}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    debug = os.getenv('FLASK_ENV') != 'production'
    print(f"lincmatik backend calisiyor — port {port}")
    app.run(debug=debug, host='0.0.0.0', port=port)
