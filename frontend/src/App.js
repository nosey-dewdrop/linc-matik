import './App.css';
import { useState, useEffect } from 'react';

// Typing Effect Component for Quote
function TypingQuote() {
  const [text, setText] = useState('');
  const fullText = 'bu tamamen iyi insanların kendilerini hazırlaması içindir. insanlar tahmin edilemez saçmalıklarına hazırlık yapabilmeniz için.';
  
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) {
        clearInterval(timer);
      }
    }, 30); // Faster typing for longer text
    return () => clearInterval(timer);
  }, []);

  return <p className="page-subtitle">{text}</p>;
}

function App() {
  const [input, setInput] = useState('');
  const [lincler, setLincler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [visibleComments, setVisibleComments] = useState(0);

  // Yorumları tek tek göster
  useEffect(() => {
    if (lincler.length > 0 && visibleComments < lincler.length) {
      const timer = setTimeout(() => {
        setVisibleComments(prev => prev + 1);
      }, 500); // Her 500ms'de bir yorum
      return () => clearTimeout(timer);
    }
  }, [visibleComments, lincler.length]);

  const handleInitial = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    setVisibleComments(0); // Reset visible comments

    try {
      const response = await fetch('http://localhost:5002/generate-linc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'initial',
          statement: input
        }),
      });

      const data = await response.json();
      
      if (data.yorumlar) {
        const lincsWithState = data.yorumlar.map(l => ({
          ...l,
          conversation: [{ role: 'Eleştiren', text: l.text }]
        }));
        setLincler(lincsWithState);
        setInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (lincId) => {
    if (!replyInput.trim() || loading) return;

    const linc = lincler.find(l => l.id === lincId);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5002/generate-linc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reply',
          linc_text: linc.text,
          user_reply: replyInput
        }),
      });

      const data = await response.json();
      
      if (data.response) {
        const updatedLincler = lincler.map(l => {
          if (l.id === lincId) {
            return {
              ...l,
              conversation: [
                ...l.conversation,
                { role: 'Sen', text: replyInput },
                { role: 'Eleştiren', text: data.response }
              ]
            };
          }
          return l;
        });
        setLincler(updatedLincler);
        setReplyInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (lincId) => {
    setLincler(lincler.filter(l => l.id !== lincId));
    if (expandedId === lincId) setExpandedId(null);
    setVisibleComments(prev => Math.max(0, prev - 1));
  };

  const handleAnalyze = async () => {
    if (lincler.length === 0) return;

    setLoading(true);

    const allConversations = lincler.flatMap(l => l.conversation);

    try {
      const response = await fetch('http://localhost:5002/generate-linc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'analyze',
          conversation: allConversations
        }),
      });

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      <div className="header">
        <div className="logo">linçmatik</div>
      </div>

      <div className="container">
        {lincler.length === 0 && !analysis && (
          <>
            <TypingQuote />

            <div className="input-row">
              <textarea
                className="main-input"
                placeholder="buraya yaz...."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button className="add-btn" onClick={handleInitial} disabled={loading}>
                {loading ? 'bekliyorum...' : 'bekliyorum!!'}
              </button>
            </div>

            <div className="footer-quote">
              <p className="quote-left">
                asla bir domuzla güreşme. ikiniz de çamur içinde kalırsınız ama o bundan keyif alır.
              </p>
              <p className="username-right">@damumya</p>
            </div>
          </>
        )}

        {lincler.length > 0 && !analysis && (
          <>
            <div className="list-container">
              {lincler.slice(0, visibleComments).map((linc, index) => (
                <div 
                  key={linc.id} 
                  className="list-item"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="item-row">
                    <span className="drag-handle">≡</span>
                    <span 
                      className="item-text" 
                      onClick={() => setExpandedId(expandedId === linc.id ? null : linc.id)}
                    >
                      {linc.text}
                    </span>
                    <div className="item-actions">
                      <button 
                        className="icon-btn"
                        onClick={() => setExpandedId(expandedId === linc.id ? null : linc.id)}
                      >
                        ⋮
                      </button>
                    </div>
                  </div>

                  {expandedId === linc.id && (
                    <div className="expanded-content">
                      <div className="conversation">
                        {linc.conversation.map((msg, idx) => (
                          <div key={idx} className={`msg ${msg.role === 'Sen' ? 'user' : 'ai'}`}>
                            <strong>{msg.role}:</strong> {msg.text}
                          </div>
                        ))}
                      </div>

                      <div className="reply-area">
                        <input
                          type="text"
                          placeholder="Cevap yazın..."
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleReply(linc.id)}
                          disabled={loading}
                        />
                        <button onClick={() => handleReply(linc.id)} disabled={loading}>
                          Gönder
                        </button>
                      </div>

                      <button className="remove-btn" onClick={() => handleRemove(linc.id)}>
                        Uğraşamam (Sil)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {visibleComments === lincler.length && (
              <div className="bottom-actions">
                <button className="action-button" onClick={handleAnalyze} disabled={loading}>
                  Tümünü Analiz Et
                </button>
                <button className="action-button secondary" onClick={handleReset}>
                  Yeniden Başla
                </button>
              </div>
            )}

            <div className="footer-quote">
              <p className="quote-left">
                asla bir domuzla güreşme. ikiniz de çamur içinde kalırsınız ama o bundan keyif alır.
              </p>
              <p className="username-right">@damumya</p>
            </div>
          </>
        )}

        {analysis && (
          <>
            <div className="analysis-box">
              <h2>📊 Psikolojik Analiz</h2>
              
              <div className="analysis-section">
                <h3>Sizin Durumunuz:</h3>
                <p>{analysis.kullanici_durum}</p>
              </div>

              <div className="analysis-section">
                <h3>Eleştirenlerin Durumu:</h3>
                <p>{analysis.elestiren_durum}</p>
              </div>

              <div className="analysis-section">
                <h3>Genel Değerlendirme:</h3>
                <p>{analysis.genel}</p>
              </div>

              <button className="action-button" onClick={handleReset}>
                Yeni Simülasyon
              </button>
            </div>

            <div className="footer-quote">
              <p className="quote-left">
                asla bir domuzla güreşme. ikiniz de çamur içinde kalırsınız ama o bundan keyif alır.
              </p>
              <p className="username-right">@damumya</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;