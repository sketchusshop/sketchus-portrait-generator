import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { SHOP_CONFIG, DESIGN, LANG } from '../config';

const D = DESIGN;
const HIST_KEY = 'sk_hist_v10';
const RATIO = 297 / 210;
const BG = '#636363'; // màu Sketchus

function getLang() {
  if (typeof window === 'undefined') return 'de';
  const p = new URLSearchParams(window.location.search).get('lang');
  if (p === 'de' || p === 'en') return p;
  return navigator.language?.startsWith('en') ? 'en' : 'de';
}

function getHist() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; }
}

function addHist(item) {
  try {
    const h = getHist(); h.unshift(item);
    localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 5)));
  } catch {}
}

function savePortraitUrl(url) {
  try {
    localStorage.setItem('sk_portrait_url', url);
    window.parent.postMessage({ type: 'PORTRAIT_URL', url }, '*');
  } catch {}
}

function cropImg(src, px) {
  return new Promise(res => {
    const img = new Image(); img.src = src;
    img.onload = () => {
      const M = 1024; let w = px.width, h = px.height;
      if (w > M || h > M) { const r = Math.min(M/w, M/h); w = Math.round(w*r); h = Math.round(h*r); }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, px.x, px.y, px.width, px.height, 0, 0, w, h);
      c.toBlob(b => res(b), 'image/jpeg', 0.9);
    };
  });
}

function toB64(blob) {
  return new Promise(res => {
    const r = new FileReader();
    r.onloadend = () => res(r.result.split(',')[1]);
    r.readAsDataURL(blob);
  });
}

async function downloadDirect(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portrait-sketchus.jpg';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch { window.open(url, '_blank'); }
}

function LoadingCard({ t, bg }) {
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const tick = 250, inc = (tick / SHOP_CONFIG.estimatedMs) * 100;
    const id = setInterval(() => setPct(p => {
      const n = Math.min(p + inc, 95);
      setStep(n < 25 ? 0 : n < 55 ? 1 : n < 80 ? 2 : 3);
      return n;
    }), tick);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      background: BG,
      borderRadius: 14, padding: '18px 16px',
      width: '100%', maxWidth: 280,
      textAlign: 'center', color: '#fff',
      fontFamily: D.font,
      boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.2)',
    }}>
      {bg && (
        <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', margin: '0 auto 10px' }}>
          <img src={bg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <p style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6, margin: '0 0 6px' }}>WIRD ERSTELLT</p>
      <p style={{ fontSize: 13, fontWeight: 'bold', margin: '0 0 12px' }}>{t.loadingSteps[step]}…</p>
      <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#fff', width: `${pct}%`, transition: 'width 0.25s', borderRadius: 99 }} />
      </div>
      {t.loadingSteps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, textAlign: 'left' }}>
          <span style={{ width: 13, textAlign: 'center', fontSize: 10, color: i <= step ? '#fff' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
            {i < step ? '✓' : i === step ? '●' : '○'}
          </span>
          <span style={{ fontSize: 11, color: i === step ? '#fff' : i < step ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)', fontWeight: i === step ? 'bold' : 'normal' }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const lang = useRef(getLang()).current;
  const t = LANG[lang];

  const [rawSrc, setRawSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPx, setCropPx] = useState(null);
  const [prevSrc, setPrevSrc] = useState(null);
  const [prevBlob, setPrevBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [hist, setHist] = useState([]);
  const [showHist, setShowHist] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const MAX = SHOP_CONFIG.maxPreviews;

  useEffect(() => { setHist(getHist()); }, []);
// Thêm function này vào App()
function sendHeight() {
  const h = document.body.scrollHeight;
  window.parent.postMessage({ type: 'IFRAME_HEIGHT', height: h }, '*');
}

// Thêm useEffect này
useEffect(() => {
  sendHeight();
}, [result, loading, showCrop, showHist, prevSrc]);

  function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setRawSrc(URL.createObjectURL(f));
    setPrevSrc(null); setPrevBlob(null); setResult(null); setError(null);
    setCrop({ x: 0, y: 0 }); setZoom(1); setShowCrop(true);
  }

  const onCropDone = useCallback((_, px) => setCropPx(px), []);

  async function saveCrop() {
    const blob = await cropImg(rawSrc, cropPx);
    setPrevBlob(blob); setPrevSrc(URL.createObjectURL(blob)); setShowCrop(false);
  }

  function cancelCrop() { setShowCrop(false); if (!prevSrc) setRawSrc(null); }

  async function generate() {
    if (!prevBlob || count >= MAX) return;
    setLoading(true); setError(null);
    try {
      const b64 = await toB64(prevBlob);
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errGeneric);
      const item = { previewUrl: data.previewUrl, storedUrl: data.storedUrl, createdAt: new Date().toLocaleString('de-DE') };
      addHist(item); setHist(getHist()); setResult(item); setCount(c => c + 1);
      savePortraitUrl(data.storedUrl);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const BR = D.btn; const F = D.font;

  return (
    <div style={{ background: BG, fontFamily: F, color: D.text, boxSizing: 'border-box' }}>

      {/* Loading — ô nhỏ, nền cùng màu Sketchus */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(99,99,99,0.75)', // #636363 mờ
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <LoadingCard t={t} bg={prevSrc} />
        </div>
      )}

      {/* Crop Modal — nền cùng màu Sketchus */}
      {showCrop && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: BG, // cùng màu #636363, không đen
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 12px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: '100%', maxWidth: 400,
            display: 'flex', flexDirection: 'column',
            gap: 0,
          }}>
            {/* Title nhỏ */}
            <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: 13, color: '#fff', textAlign: 'center' }}>
              {t.cropTitle}
            </p>

            {/* Crop area */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#4a4a4a', borderRadius: 8, overflow: 'hidden' }}>
              <Cropper
                image={rawSrc} crop={crop} zoom={zoom} aspect={RATIO}
                onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropDone}
                style={{ containerStyle: { position: 'absolute', inset: 0 } }}
              />
            </div>

            {/* Nút nhỏ bên dưới */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={cancelCrop} style={{
                flex: 1, padding: '11px 0',
                background: 'rgba(255,255,255,0.15)', color: '#ddd',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: F,
              }}>
                {t.cropCancel}
              </button>
              <button onClick={saveCrop} style={{
                flex: 1, padding: '11px 0',
                background: '#fff', color: '#1a1a1a',
                border: 'none',
                borderRadius: 6, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: F,
              }}>
                {t.cropSave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHist && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: BG, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>{t.historyTitle} ({hist.length})</span>
            <button onClick={() => setShowHist(false)} style={{ background: 'none', border: 'none', color: D.textMuted, fontSize: 24, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {hist.map((item, i) => (
              <div key={i} style={{ marginBottom: 14, border: `1px solid ${D.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <img src={item.previewUrl} alt="" style={{ width: '100%', display: 'block' }} />
                <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.15)' }}>
                  <p style={{ color: D.textDim, fontSize: 10, margin: '0 0 8px' }}>#{hist.length - i} · {item.createdAt}</p>
                  <button onClick={() => { setResult(item); savePortraitUrl(item.storedUrl); setShowHist(false); }}
                    style={{ width: '100%', padding: '10px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: BR, fontSize: 13, fontWeight: 'bold', cursor: 'pointer' }}>
                    {t.historySelect}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main — compact, không khoảng trống ── */}
      <div style={{ padding: '10px 12px 20px', maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <h1 style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', margin: '0 0 2px' }}>{t.title}</h1>
        <p style={{ fontSize: 11, color: D.textMuted, textAlign: 'center', margin: '0 0 2px', lineHeight: 1.4 }}>{t.sub}</p>
        <p style={{ fontSize: 10, color: D.textDim, textAlign: 'center', margin: '0 0 12px' }}>{t.counter(count, MAX)}</p>

        {/* Step 1 — Upload */}
        <p style={{ fontSize: 10, letterSpacing: 2, color: D.textDim, textTransform: 'uppercase', margin: '0 0 5px' }}>① Foto hochladen</p>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(0,0,0,0.15)', border: `1px solid ${D.border}`,
          borderRadius: 8, padding: '8px 10px', cursor: 'pointer', marginBottom: 12,
        }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
          {prevSrc
            ? <img src={prevSrc} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            : <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📷</div>
          }
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', color: D.text, fontSize: 13 }}>{prevSrc ? t.change : t.upload}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: D.textDim }}>{t.uploadHint}</p>
          </div>
        </label>

        {/* Step 2 — Generate */}
        <p style={{ fontSize: 10, letterSpacing: 2, color: D.textDim, textTransform: 'uppercase', margin: '0 0 5px' }}>② Vorschau erstellen</p>
        <button onClick={generate} disabled={!prevBlob || loading || count >= MAX}
          style={{
            width: '100%', padding: '12px 0',
            background: prevBlob && count < MAX ? '#fff' : 'rgba(255,255,255,0.25)',
            color: '#1a1a1a', border: 'none', borderRadius: BR,
            fontSize: 15, fontWeight: 'bold',
            cursor: prevBlob && count < MAX ? 'pointer' : 'not-allowed',
            marginBottom: 4, fontFamily: F,
          }}>
          {t.generate}
        </button>
        {count >= MAX && <p style={{ color: D.error, textAlign: 'center', fontSize: 11, margin: '4px 0' }}>{t.limitMsg(MAX)}</p>}
        {error && <p style={{ color: D.error, textAlign: 'center', fontSize: 11, margin: '4px 0' }}>{error}</p>}

        {/* Step 3 — Result */}
        {result && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, letterSpacing: 2, color: D.textDim, textTransform: 'uppercase', margin: '0 0 8px' }}>③ Dein Portrait</p>

            {/* Khung tranh */}
            <div style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.45)', borderRadius: 2, marginBottom: 10 }}>
              <div style={{ padding: 14, background: 'linear-gradient(135deg, #3a2a1a 0%, #5c3d20 30%, #4a3020 60%, #3a2a1a 100%)' }}>
                <div style={{ padding: 8, background: '#f8f4ed', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                  <img src={result.previewUrl} alt="Portrait" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
            </div>

            {/* Nút lưu ảnh */}
            <button
              onClick={async () => { setDownloading(true); await downloadDirect(result.storedUrl); setDownloading(false); }}
              disabled={downloading}
              style={{
                width: '100%', padding: '12px 0',
                background: 'rgba(255,255,255,0.12)', color: D.text,
                border: `1px solid ${D.border}`,
                borderRadius: BR, fontSize: 13, fontWeight: 'bold',
                cursor: 'pointer', marginBottom: 10, fontFamily: F,
              }}
            >
              {downloading ? '…' : '⬇ ' + (lang === 'de' ? 'Portrait auf Gerät speichern' : 'Save portrait to device')}
            </button>

            {/* Thông điệp mua hàng */}
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', textAlign: 'center', marginBottom: 12, border: `1px solid rgba(255,255,255,0.12)` }}>
              <p style={{ margin: 0, fontSize: 12, color: D.text, lineHeight: 1.6 }}>
                {lang === 'de'
                  ? '🎨 Zufrieden mit dieser Skizze? Klicke auf den Warenkorb — du erhältst dein Poster in wenigen Tagen.'
                  : '🎨 Happy with this sketch? Click the cart button — you\'ll receive your poster in a few days.'
                }
              </p>
            </div>

            
          </div>
        )}

        {/* History */}
        {hist.length > 0 && (
          <button onClick={() => setShowHist(true)}
            style={{ width: '100%', padding: '9px 0', background: 'transparent', color: D.textDim, border: `1px solid rgba(255,255,255,0.12)`, borderRadius: BR, fontSize: 12, cursor: 'pointer', fontFamily: F, marginTop: 12 }}>
            {t.history(hist.length)}
          </button>
        )}
      </div>
    </div>
  );
}
