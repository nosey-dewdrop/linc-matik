import './App.css';
import { useState, useEffect, useCallback } from 'react';

/* ════ TROLL PERSONAS ════ */
const TROLLS = [
  { name: 'Toxic Teyze',     handle: '@toxic_teyze',     initials: 'TT', gradient: 'linear-gradient(135deg, #e84580, #d42d6a)' },
  { name: 'Keyboard Warrior', handle: '@keyboard_warrior', initials: 'KW', gradient: 'linear-gradient(135deg, #8e35b8, #5e1a82)' },
  { name: 'Moral Bekçisi',   handle: '@moral_bekcisi',   initials: 'MB', gradient: 'linear-gradient(135deg, #b05ed4, #7a2a9e)' },
  { name: 'Haklı Hasan',     handle: '@hakli_hasan',     initials: 'HH', gradient: 'linear-gradient(135deg, #c98be3, #8e35b8)' },
  { name: 'Bilmiş Burcu',    handle: '@bilmis_burcu',    initials: 'BB', gradient: 'linear-gradient(135deg, #f472a8, #e84580)' },
];

const FLOAT_EMOJIS = [
  '🎀', '🌸', '💜', '✨', '🦋', '💐', '🌙', '💫', '🌷', '👾',
  '🎀', '✨', '💜', '🌸', '🦋', '🌙', '💫', '🌷', '💐', '✨',
  '🎀', '🌸', '💜', '🦋', '🌙', '💫',
];

/* ════ FLOATING EMOJIS ════ */
function FloatingEmojis() {
  return (
    <div className="float-box" aria-hidden="true">
      {FLOAT_EMOJIS.map((e, i) => (
        <span key={i} className="fl" style={{
          left: `${(i * 3.7) % 96}%`,
          animationDelay: `${(i * 1.1) % 18}s`,
          animationDuration: `${14 + (i % 5) * 3}s`,
          fontSize: `${14 + (i % 4) * 5}px`,
        }}>{e}</span>
      ))}
    </div>
  );
}

/* ════ useTheme ════ */
function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('lm-theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('lm-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, useCallback(() => setDark(d => !d), [])];
}

/* ════ TYPING TEXT ════ */
function TypingText({ text }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    setDone(false);
    const t = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) { clearInterval(t); setDone(true); }
    }, 28);
    return () => clearInterval(t);
  }, [text]);

  return <span>{displayed}{!done && <span className="typing-cursor" />}</span>;
}

/* ════ LOADING DOTS ════ */
function LoadingDots() {
  return <span className="loading-dots"><span /><span /><span /></span>;
}

/* ════ APP ════ */
function App() {
  const [dark, toggleTheme] = useTheme();
  const [input, setInput] = useState('');
  const [lincler, setLincler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [visibleComments, setVisibleComments] = useState(0);

  // Staggered reveal
  useEffect(() => {
    if (lincler.length > 0 && visibleComments < lincler.length) {
      const t = setTimeout(() => setVisibleComments(p => p + 1), 420);
      return () => clearTimeout(t);
    }
  }, [visibleComments, lincler.length]);

  const handleInitial = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setVisibleComments(0);
    try {
      const res = await fetch('http://localhost:5002/generate-linc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initial', statement: input }),
      });
      const data = await res.json();
      if (data.yorumlar) {
        setLincler(data.yorumlar.map((l, i) => ({
          ...l,
          troll: TROLLS[i % TROLLS.length],
          conversation: [{ role: 'Eleştiren', text: l.text }],
        })));
        setInput('');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleReply = async (id) => {
    if (!replyInput.trim() || loading) return;
    const linc = lincler.find(l => l.id === id);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5002/generate-linc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', linc_text: linc.text, user_reply: replyInput }),
      });
      const data = await res.json();
      if (data.response) {
        setLincler(p => p.map(l => l.id === id ? {
          ...l,
          conversation: [...l.conversation, { role: 'Sen', text: replyInput }, { role: 'Eleştiren', text: data.response }],
        } : l));
        setReplyInput('');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRemove = (id) => {
    setLincler(p => p.filter(l => l.id !== id));
    if (expandedId === id) setExpandedId(null);
    setVisibleComments(p => Math.max(0, p - 1));
  };

  const handleAnalyze = async () => {
    if (!lincler.length) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5002/generate-linc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', conversation: lincler.flatMap(l => l.conversation) }),
      });
      setAnalysis(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setLincler([]);
    setAnalysis(null);
    setExpandedId(null);
    setReplyInput('');
    setVisibleComments(0);
  };

  return (
    <div className="app">
      <div className="dot-bg" />
      <FloatingEmojis />
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="container">

        {/* ─── LANDING ─── */}
        {lincler.length === 0 && !analysis && (
          <div className="landing">
            <div className="brand-icon">💐</div>
            <h1 className="brand-title">🦋 <em>linçmatik</em> 🎀</h1>
            <span className="ribbon-badge">mental dayanıklılık antrenmanı</span>
            <div className="input-area">
              <textarea
                className="main-input"
                placeholder="buraya yaz..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
              />
              <button className="submit-btn" onClick={handleInitial} disabled={loading}>
                {loading ? <LoadingDots /> : 'bekliyorum!!'}
              </button>
            </div>
          </div>
        )}

        {/* ─── LINC CARDS ─── */}
        {lincler.length > 0 && !analysis && (
          <div className="linc-cards">
            {lincler.slice(0, visibleComments).map((linc, i) => (
                <div key={linc.id} className="linc-card vis" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="card-header" onClick={() => setExpandedId(expandedId === linc.id ? null : linc.id)}>
                    <div className="card-meta">
                      <div className="troll-name">{linc.troll.name}</div>
                      <div className="troll-handle">{linc.troll.handle}</div>
                    </div>
                    <button className="card-expand-btn">{expandedId === linc.id ? '−' : '+'}</button>
                  </div>
                  <div className="card-text">{linc.text}</div>

                  {expandedId === linc.id && (
                    <div className="card-expanded">
                      <div className="conversation">
                        {linc.conversation.map((msg, idx) => (
                          <div key={idx} className={`msg ${msg.role === 'Sen' ? 'user' : 'ai'}`}>
                            <strong>{msg.role}</strong>{msg.text}
                          </div>
                        ))}
                      </div>
                      <div className="reply-area">
                        <input
                          type="text"
                          placeholder="cevap yaz..."
                          value={replyInput}
                          onChange={e => setReplyInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleReply(linc.id)}
                          disabled={loading}
                        />
                        <button onClick={() => handleReply(linc.id)} disabled={loading}>
                          {loading ? <LoadingDots /> : 'gönder'}
                        </button>
                      </div>
                      <button className="remove-btn" onClick={() => handleRemove(linc.id)}>
                        uğraşamam (sil)
                      </button>
                    </div>
                  )}
                </div>
            ))}

            {visibleComments === lincler.length && (
              <div className="bottom-actions">
                <button className="action-button" onClick={handleAnalyze} disabled={loading}>
                  {loading ? <LoadingDots /> : 'tümünü analiz et'}
                </button>
                <button className="action-button secondary" onClick={handleReset}>yeniden başla</button>
              </div>
            )}
          </div>
        )}

        {/* ─── ANALYSIS ─── */}
        {analysis && (
          <div className="analysis-box">
            <h2>psikolojik analiz</h2>
            <div className="analysis-section">
              <h3>sizin durumunuz</h3>
              <p>{analysis.kullanici_durum}</p>
            </div>
            <div className="analysis-section">
              <h3>eleştirenlerin durumu</h3>
              <p>{analysis.elestiren_durum}</p>
            </div>
            <div className="analysis-section">
              <h3>genel değerlendirme</h3>
              <p>{analysis.genel}</p>
            </div>
            <div className="bottom-actions">
              <button className="action-button" onClick={handleReset}>yeni simülasyon</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
