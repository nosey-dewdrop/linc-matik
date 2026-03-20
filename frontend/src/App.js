import './App.css';
import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

/* ════ TROLL PERSONAS ════ */
const TROLLS = [
  { name: 'Toxic Teyze',     handle: '@toxic_teyze',     initials: 'TT', gradient: 'linear-gradient(135deg, #e84580, #d42d6a)' },
  { name: 'Keyboard Warrior', handle: '@keyboard_warrior', initials: 'KW', gradient: 'linear-gradient(135deg, #8e35b8, #5e1a82)' },
  { name: 'Moral Bekçisi',   handle: '@moral_bekcisi',   initials: 'MB', gradient: 'linear-gradient(135deg, #b05ed4, #7a2a9e)' },
  { name: 'Haklı Hasan',     handle: '@hakli_hasan',     initials: 'HH', gradient: 'linear-gradient(135deg, #c98be3, #8e35b8)' },
  { name: 'Bilmiş Burcu',    handle: '@bilmis_burcu',    initials: 'BB', gradient: 'linear-gradient(135deg, #f472a8, #e84580)' },
];

/* ════ ÖNEMLİ KİTAPLAR ════ */
const BOOKS = [
  { title: 'Tartışma Sanatı', author: 'Arthur Schopenhauer', review: '' },
  { title: 'Kendime Düşünceler', author: 'Marcus Aurelius', review: '' },
  { title: 'Budala', author: 'Fyodor Dostoyevski', review: '' },
  { title: 'The Art of War', author: 'Sun Tzu', review: '' },
  { title: 'Böyle Buyurdu Zerdüşt', author: 'Friedrich Nietzsche', review: '' },
  { title: 'The Courage to Be Disliked', author: 'Ichiro Kishimi', review: '' },
  { title: '48 Laws of Power', author: 'Robert Greene', review: '' },
  { title: 'Prens', author: 'Niccolò Machiavelli', review: '' },
];

/* ════ ÖNEMLİ SÖZLER ════ */
const QUOTES = [
  { text: 'Asla bir domuzla güreşme. İkiniz de çamur içinde kalırsınız ama o bundan keyif alır.', author: 'George Bernard Shaw' },
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

/* ════ LOADING DOTS ════ */
function LoadingDots() {
  return <span className="loading-dots"><span /><span /><span /></span>;
}

/* ════ ERROR TOAST ════ */
function ErrorToast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="error-toast" onClick={onClose}>
      <span className="error-toast-text">{message}</span>
      <span className="error-toast-close">&times;</span>
    </div>
  );
}

/* ════ ÖNEMLİ SÖZLER PAGE ════ */
function QuotesPage({ onBack }) {
  return (
    <div className="container quotes-page">
      <button className="back-btn" onClick={onBack}>geri</button>
      <h1 className="quotes-title"><em>onemli sozler</em></h1>
      <div className="quotes-divider" />
      {QUOTES.length === 0 && <div className="q-empty">yakinda eklenecek...</div>}
      {QUOTES.map((q, i) => (
        <div key={i} className="q-item">
          <div className="q-text">"{q.text}"</div>
          <div className="q-author">-- {q.author}</div>
        </div>
      ))}
    </div>
  );
}

/* ════ ÖNEMLİ KİTAPLAR PAGE ════ */
function BooksPage({ onBack }) {
  return (
    <div className="container quotes-page">
      <button className="back-btn" onClick={onBack}>geri</button>
      <h1 className="quotes-title"><em>onemli kitaplar</em></h1>
      <div className="quotes-divider" />
      {BOOKS.length === 0 && <div className="q-empty">yakinda eklenecek...</div>}
      {BOOKS.map((b, i) => (
        <div key={i} className="q-item">
          <div className="q-book-title">{b.title}</div>
          <div className="q-author">{b.author}</div>
          {b.review && <div className="q-review">{b.review}</div>}
        </div>
      ))}
    </div>
  );
}

/* ════ APP ════ */
function App() {
  const [dark, toggleTheme] = useTheme();
  const [page, setPage] = useState('main');
  const [input, setInput] = useState('');
  const [lincler, setLincler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [visibleComments, setVisibleComments] = useState(0);
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  // staggered reveal
  useEffect(() => {
    if (lincler.length > 0 && visibleComments < lincler.length) {
      const t = setTimeout(() => setVisibleComments(p => p + 1), 320);
      return () => clearTimeout(t);
    }
  }, [visibleComments, lincler.length]);

  const apiCall = async (body) => {
    const res = await fetch(`${API_URL}/generate-linc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `hata (${res.status})`);
    }
    return res.json();
  };

  const handleInitial = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setVisibleComments(0);
    try {
      const data = await apiCall({ action: 'initial', statement: input });
      if (data.yorumlar) {
        setLincler(data.yorumlar.map((l, i) => ({
          ...l,
          troll: TROLLS[i % TROLLS.length],
          conversation: [{ role: 'Elestiren', text: l.text }],
        })));
        setInput('');
        setReplyInputs({});
      }
    } catch (err) {
      setError(err.message || 'bir seyler ters gitti, tekrar dene');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (id) => {
    const reply = (replyInputs[id] || '').trim();
    if (!reply || loading) return;
    const linc = lincler.find(l => l.id === id);
    setLoadingId(id);
    setError(null);
    try {
      const data = await apiCall({ action: 'reply', linc_text: linc.text, user_reply: reply });
      if (data.response) {
        setLincler(p => p.map(l => l.id === id ? {
          ...l,
          conversation: [...l.conversation, { role: 'Sen', text: reply }, { role: 'Elestiren', text: data.response }],
        } : l));
        setReplyInputs(p => ({ ...p, [id]: '' }));
      }
    } catch (err) {
      setError(err.message || 'cevap gonderilemedi');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = (id) => {
    setLincler(p => p.filter(l => l.id !== id));
    if (expandedId === id) setExpandedId(null);
    setVisibleComments(p => Math.max(0, p - 1));
  };

  const handleAnalyze = async () => {
    if (!lincler.length) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall({ action: 'analyze', conversation: lincler.flatMap(l => l.conversation) });
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'analiz yapilamadi');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setLincler([]);
    setAnalysis(null);
    setExpandedId(null);
    setReplyInputs({});
    setVisibleComments(0);
    setError(null);
  };

  const isReplyLoading = (id) => loadingId === id;

  return (
    <div className="app">
      <div className="dot-bg" />
      <FloatingEmojis />

      {error && <ErrorToast message={error} onClose={() => setError(null)} />}

      <div className="top-actions">
        <button className="top-btn" onClick={() => setPage(page === 'quotes' ? 'main' : 'quotes')} aria-label="Sozler">
          {page === 'quotes' ? 'x' : 'sozler'}
        </button>
        <button className="top-btn" onClick={() => setPage(page === 'books' ? 'main' : 'books')} aria-label="Kitaplar">
          {page === 'books' ? 'x' : 'kitaplar'}
        </button>
        <button className="top-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {dark ? 'light' : 'dark'}
        </button>
      </div>

      {page === 'quotes' && <QuotesPage onBack={() => setPage('main')} />}
      {page === 'books' && <BooksPage onBack={() => setPage('main')} />}

      {page === 'main' && (
        <div className="container">

          {/* LANDING */}
          {lincler.length === 0 && !analysis && (
            <div className="landing">
              <h1 className="brand-title"><em>lincmatik</em></h1>
              <span className="ribbon-badge">mental dayaniklilik antrenmani</span>
              <p className="landing-desc">
                bir sey paylas, internetteki en kotu yorumlari gorelim.
                cevap ver, analiz al, daha guclu ol.
              </p>
              <div className="input-area">
                <textarea
                  className="main-input"
                  placeholder="ne paylasiyorsun?"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleInitial();
                    }
                  }}
                  disabled={loading}
                  maxLength={1000}
                />
                <div className="input-footer">
                  <span className="char-count">{input.length}/1000</span>
                  <button className="submit-btn" onClick={handleInitial} disabled={loading || !input.trim()}>
                    {loading ? <LoadingDots /> : 'getir bakalim'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LINC CARDS */}
          {lincler.length > 0 && !analysis && (
            <>
              <div className="original-post">
                <span className="original-label">senin paylasimindan uretildi</span>
              </div>
              <div className="linc-cards">
                {lincler.slice(0, visibleComments).map((linc) => {
                  const isExpanded = expandedId === linc.id;
                  const replyVal = replyInputs[linc.id] || '';
                  const replyBusy = isReplyLoading(linc.id);

                  return (
                    <div key={linc.id} className="linc-card vis">
                      <div className="card-header" onClick={() => setExpandedId(isExpanded ? null : linc.id)}>
                        <div className="troll-avatar" style={{ background: linc.troll.gradient }}>
                          {linc.troll.initials}
                        </div>
                        <div className="card-meta">
                          <div className="troll-name">{linc.troll.name}</div>
                          <div className="troll-handle">{linc.troll.handle}</div>
                        </div>
                        <button className="card-expand-btn">{isExpanded ? '−' : '+'}</button>
                      </div>
                      <div className="card-text">{linc.text}</div>

                      {isExpanded && (
                        <div className="card-expanded">
                          {linc.conversation.length > 1 && (
                            <div className="conversation">
                              {linc.conversation.slice(1).map((msg, idx) => (
                                <div key={idx} className={`msg ${msg.role === 'Sen' ? 'user' : 'ai'}`}>
                                  <strong>{msg.role}</strong>
                                  <span>{msg.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="reply-area">
                            <input
                              type="text"
                              placeholder="cevabini yaz..."
                              value={replyVal}
                              onChange={e => setReplyInputs(p => ({ ...p, [linc.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handleReply(linc.id)}
                              disabled={replyBusy}
                              maxLength={500}
                            />
                            <button onClick={() => handleReply(linc.id)} disabled={replyBusy || !replyVal.trim()}>
                              {replyBusy ? <LoadingDots /> : 'gonder'}
                            </button>
                          </div>
                          <button className="remove-btn" onClick={() => handleRemove(linc.id)}>
                            ugrasma, sil
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {visibleComments === lincler.length && (
                <div className="bottom-actions">
                  <button className="action-button" onClick={handleAnalyze} disabled={loading}>
                    {loading ? <LoadingDots /> : 'tumunu analiz et'}
                  </button>
                  <button className="action-button secondary" onClick={handleReset}>yeniden basla</button>
                </div>
              )}
            </>
          )}

          {/* ANALYSIS */}
          {analysis && (
            <div className="analysis-box">
              <h2>psikolojik analiz</h2>
              {analysis.kullanici_durum && (
                <div className="analysis-section lilac">
                  <h3>senin durumun</h3>
                  <p>{analysis.kullanici_durum}</p>
                </div>
              )}
              {analysis.elestiren_durum && (
                <div className="analysis-section pink">
                  <h3>elestirenler</h3>
                  <p>{analysis.elestiren_durum}</p>
                </div>
              )}
              {analysis.genel && (
                <div className="analysis-section gold">
                  <h3>genel degerlendirme</h3>
                  <p>{analysis.genel}</p>
                </div>
              )}
              {analysis.error && (
                <div className="analysis-section error">
                  <p>{analysis.error}</p>
                </div>
              )}
              <div className="bottom-actions">
                <button className="action-button" onClick={handleReset}>yeni simulasyon</button>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-inner">
          <span className="footer-quote">"asla bir domuzla guresme. ikiniz de camur icinde kalirsiniz ama o bundan keyif alir."</span>
          <span className="footer-sig">@damumya</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
