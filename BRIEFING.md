# LİNÇMATİK — Proje Brifing (Claude Code için)

## Proje Nedir?
Flask backend + React frontend. Claude API ile sosyal medya linç simülatörü.
Kullanıcı bir şey paylaşıyor → 5 toxic yorum üretiliyor → kullanıcı cevap verebiliyor → psikolojik analiz yapılıyor.
Mental dayanıklılık antrenmanı konsepti. Schopenhauer, Nietzsche, Prens Mışkin referansları.

## Repo
- GitHub: https://github.com/nosey-dewdrop/linc-matik
- Backend: app.py (Flask, port 5002)
- Frontend: frontend/ (Create React App, port 3000)

## Tasarım Kararları

### Renk Paleti: Lila + Pembe + Kurdele
- Lila spectrum: #faf2fd → #5e1a82
- Pink secondary: #fcd5e3 → #e84580  
- Ribbon gold aksan: #f5c842
- Dark mode desteği var

### Fontlar
- Headings: Playfair Display (serif, italic accent)
- Body: DM Sans
- Badges/monospace: JetBrains Mono

### Stil Referansları (iki projeden hybrid)

#### Dewdrop Mock (events platform) — yapısal DNA:
- Design token sistemi (CSS variables)
- Grain overlay (fractalNoise SVG texture)
- Radial glow (lilac top-right, pink bottom-left)
- Spring animations (cubic-bezier 0.34, 1.56, 0.64, 1)
- fadeUp stagger reveal
- Backdrop blur navbar
- Shadow katmanları (sh1, sh2, sh3)
- Dark mode toggle

#### Portfolio (nosey-dewdrop.github.io) — sıcaklık DNA:
- Dot-bg pattern (radial-gradient dots, 36px grid, opacity 0.18)
- Floating emojiler (🎀🌸💜✨🦋💐🌙💫🌷 — floatD keyframe, 18s)
- JetBrains Mono badges
- 2.5px kalın border kartlar
- Emoji section headers
- Footer emoji strip

### Genel His
- İkisinin tam ortası — dewdrop temizliği + portfolio sıcaklığı
- Navbar YOK, sadece içerik + sağ üstte minimal dark mode toggle
- 🎀 kurdele branding throughout

## Backend (app.py) Düzeltmeleri
1. System prompt eklenmeli — Claude'a JSON formatı zorunlu kılıyor
2. extract_json() fonksiyonu — 3 katmanlı parsing (direkt → markdown strip → regex)
3. Bilinmeyen action kontrolü (initial/reply/analyze dışı → 400)
4. Boş request validasyonu
5. Startup'ta API key kontrolü ve log

## Frontend Yapısı

### Dosyalar:
- src/index.css → design tokens, dot-bg, floating emoji keyframes, grain overlay
- src/App.css → component styles
- src/App.js → React component
- src/index.js → entry point (değişmedi)
- public/index.html → title "linçmatik 🎀", font preconnect

### App.js Componentleri:
- FloatingEmojis — 10 emoji, fixed positioned, floatD animation
- useTheme hook — dark/light toggle, localStorage persist
- TypingText — typing effect with cursor
- LoadingDots — 3 bouncing dots
- TROLLS array — 5 persona: toxic_teyze, keyboard_warrior, moral_bekçisi, haklı_hasan, bilmiş_burcu
- 3 state: Landing → Linç Cards → Analysis

### Landing State:
- 🎀 icon + "linçmatik" (Playfair, em italic accent)
- Ribbon badge: "mental dayanıklılık antrenmanı"
- Typing quote
- Textarea + submit button

### Linç Cards State:
- Staggered reveal (420ms per card)
- Avatar with gradient + troll initials
- @username in JetBrains Mono
- Expandable: conversation (chat bubbles) + reply input + remove button
- Ribbon divider (🎀 between lines)
- Bottom actions: "tümünü analiz et" + "yeniden başla"

### Analysis State:
- 3 sections with colored left borders (lilac, pink, gold)
- Labels in JetBrains Mono uppercase
- "yeni simülasyon" reset button

### Footer:
- Fixed quote: "asla bir domuzla güreşme..." — @damumya
- Emoji strip: 🎀 💫 🌙 ✨ 🌸 💐 💜 🌷 🦋 👾

## Bilinen Sorunlar
- Root'ta eski index.html var (tek dosyalık prototip, React ile alakası yok — silinebilir)
- onKeyPress deprecated → onKeyDown kullanılmalı (App.js'de düzeltildi)
- Reply action'da conversation history backend'e gönderilmiyor (sadece tek linç + tek cevap)

## Önemli Notlar
- .env dosyasında ANTHROPIC_API_KEY olmalı
- Backend port: 5002, Frontend port: 3000
- CORS sadece localhost:3000'a açık
- Model: claude-sonnet-4-20250514
