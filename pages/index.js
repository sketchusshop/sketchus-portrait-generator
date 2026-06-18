import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { SHOP_CONFIG, DESIGN, LANG } from '../config';

const D = DESIGN;
const HIST_KEY = 'sk_hist_v7';
const RATIO = 297 / 210; // Chỉ ngang A4

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

function LoadingScreen({ bg, t }) {
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#636363', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {bg && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.25)', transform: 'scale(1.1)' }} />}
      <div style={{ position: 'relative', width: '88%', maxWidth: 340, textAlign: 'center', color: '#fff', fontFamily: D.font }}>
        <p style={{ fontSize: 10, letterSpacing: 3, color: D.textDim, textTransform: 'uppercase', marginBottom: 10 }}>WIRD ERSTELLT</p>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>{t.loadingSteps[step]}…</h2>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', width: `${pct}%`, transition: 'width 0.25s', borderRadius: 99 }} />
        </div>
        {t.loadingSteps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textAlign: 'left' }}>
            <span style={{ width: 18, textAlign: 'center', fontSize: 12, color: i <= step ? '#fff' : 'rgba(255,255,255,0.2)' }}>
              {i < step ? '✓' : i === step ? '●' : '○'}
            </span>
            <span style={{ fontSize: 13, color: i === step ? '#fff' : i < step ? D.textMuted : 'rgba(255,255,255,0.2)', fontWeight: i === step ? 'bold' : 'normal' }}>{s}</span>
          </div>
        ))}
        <p style={{ fontSize: 12, color: D.textDim, marginTop: 20, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16 }}>{t.loadingNote}</p>
      </div>
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
  const [cartLoading, setCartLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [hist, setHist] = useState([]);
  const [showHist, setShowHist] = useState(false);

  const MAX = SHOP_CONFIG.maxPreviews;

  useEffect(() => { setHist(getHist()); }, []);

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
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function addToCart(item) {
    setCartLoading(true); setError(null);
    try {
      const res = await fetch('/api/cart-add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: SHOP_CONFIG.variantId, portraitUrl: item.storedUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.cartErr);
      window.top.location.href = data.checkoutUrl;
    } catch (e) { setError(e.message); setCartLoading(false); }
  }

  function downloadImg(url) {
    const a = document.createElement('a');
    a.href = url; a.download = 'portrait-sketchus.jpg';
    a.target = '_blank'; a.click();
  }

  function reset() {
    setResult(null); setError(null);
    setPrevSrc(null); setPrevBlob(null); setRawSrc(null);
  }

  const BR = D.btn; const F = D.font;

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: F, color: D.text, boxSizing: 'border-box' }}>
      {loading && <LoadingScreen bg={prevSrc} t={t} />}

      {/* ── Crop Modal — popup nhỏ gọn, không full screen ── */}
      {showCrop && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '60px 16px', // padding top/bottom tránh icon
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16,
            width: '100%', maxWidth: 420,
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            maxHeight: '80vh',
          }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: 16, color: '#1a1a1a', textAlign: 'center' }}>
                {t.cropTitle}
              </p>
            </div>

            {/* Crop area — vuông vức, không tràn */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#333', flexShrink: 0 }}>
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                aspect={RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropDone}
                showGrid={true}
                style={{
                  containerStyle: { position: 'absolute', inset: 0 },
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
              <button onClick={cancelCrop} style={{
                flex: 1, padding: '16px 0', background: '#f5f5f5', color: '#666',
                border: 'none', borderTop: '1px solid #eee',
                fontSize: 15, cursor: 'pointer', fontFamily: F,
                borderBottomLeftRadius: 16,
              }}>
                {t.cropCancel}
              </button>
              <button onClick={saveCrop} style={{
                flex: 1, padding: '16px 0', background: '#1a1a1a', color: '#fff',
                border: 'none', borderTop: '1px solid #eee',
                fontSize: 15, fontWeight: 'bold', cursor: 'pointer', fontFamily: F,
                borderBottomRightRadius: 16,
              }}>
                {t.cropSave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Panel ── */}
      {showHist && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: D.bg, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{t.historyTitle} ({hist.length})</span>
            <button onClick={() => setShowHist(false)} style={{ background: 'none', border: 'none', color: D.textMuted, fontSize: 26, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {hist.map((item, i) => (
              <div key={i} style={{ marginBottom: 16, border: `1px solid ${D.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ border: '8px solid #2a2a2a', background: '#fff', lineHeight: 0 }}>
                  <img src={item.previewUrl} alt="" style={{ width: '100%', display: 'block' }} />
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)' }}>
                  <p style={{ color: D.textDim, fontSize: 11, margin: '0 0 10px' }}>#{hist.length - i} · {item.createdAt}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setResult(item); setShowHist(false); }}
                      style={{ flex: 1, padding: '11px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: BR, fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>
                      {t.historySelect}
                    </button>
                    <button onClick={() => { setShowHist(false); addToCart(item); }}
                      style={{ flex: 1, padding: '11px 0', background: 'transparent', color: D.text, border: `1px solid ${D.border}`, borderRadius: BR, fontSize: 13, cursor: 'pointer' }}>
                      {t.addToCart}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div style={{ padding: '20px 16px 48px', maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>{t.title}</h1>
        <p style={{ fontSize: 13, color: D.textMuted, textAlign: 'center', marginBottom: 4, lineHeight: 1.5 }}>{t.sub}</p>
        <p style={{ fontSize: 12, color: D.textDim, textAlign: 'center', marginBottom: 24 }}>{t.counter(count, MAX)}</p>

        {/* Step 1 — Upload */}
        <p style={{ fontSize: 11, letterSpacing: 2, color: D.textDim, textTransform: 'uppercase', marginBottom: 8 }}>① Foto hochladen</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.15)', border: `1px solid ${D.border}`, borderRadius: 10, padding: 12, cursor: 'pointer', marginBottom: 20 }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
          {prevSrc
            ? <img src={prevSrc} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            : <div style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📷</div>
          }
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', color: D.text, fontSize: 14 }}>{prevSrc ? t.change : t.upload}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: D.textDim }}>{t.uploadHint}</p>
          </div>
        </label>

        {/* Step 2 — Generate */}
        <p style={{ fontSize: 11, letterSpacing: 2, color: D.textDim, textTransform: 'uppercase', marginBottom: 8 }}>② Vorschau erstellen</p>
        <button onClick={generate} disabled={!prevBlob || loading || count >= MAX}
          style={{ width: '100%', padding: '15px 0', background: prevBlob && count < MAX ? '#fff' : 'rgba(255,255,255,0.25)', color: '#1a1a1a', border: 'none', borderRadius: BR, fontSize: 16, fontWeight: 'bold', cursor: prevBlob && count < MAX ? 'pointer' : 'not-allowed', marginBottom: 8, fontFamily: F }}>
          {t.generate}
        </button>
        {count >= MAX && <p style={{ color: D.error, textAlign: 'center', fontSize: 13, marginBottom: 8 }}>{t.limitMsg(MAX)}</p>}
        {error && <p style={{ color: D.error, textAlign: 'center', fontSize: 13, marginBottom: 8 }}>{error}</p>}

        {/* Step 3 — Result */}
        {result && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 11, letterSpacing: 2, color: D.textDim, textTransform: 'uppercase', marginBottom: 12 }}>③ Dein Portrait</p>

            {/* Khung ảnh ngang */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{
                padding: '20px 14px',
                background: '#1a1a1a',
                borderRadius: 6,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              }}>
                <div style={{ padding: 6, background: '#f5f0e8', lineHeight: 0 }}>
                  <img src={result.previewUrl} alt="Portrait" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>

              {/* Nút tải góc trên phải */}
              <button onClick={() => downloadImg(result.storedUrl)} style={{
                position: 'absolute', top: 8, right: 8,
                padding: '7px 12px', fontSize: 12, fontWeight: 'bold',
                background: 'rgba(0,0,0,0.75)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6, cursor: 'pointer',
              }}>
                {t.download}
              </button>
            </div>

            <p style={{ fontSize: 11, color: D.textDim, textAlign: 'center', marginBottom: 16 }}>{result.createdAt}</p>

            {/* Nút In den Warenkorb */}
            <button onClick={() => addToCart(result)} disabled={cartLoading}
              style={{ width: '100%', padding: '15px 0', background: cartLoading ? 'rgba(255,255,255,0.5)' : '#fff', color: '#1a1a1a', border: 'none', borderRadius: BR, fontSize: 16, fontWeight: 'bold', cursor: cartLoading ? 'not-allowed' : 'pointer', marginBottom: 10, fontFamily: F }}>
              {cartLoading ? t.addingToCart : t.addToCart}
            </button>

            {/* Nút tạo lại */}
            <button onClick={reset}
              style={{ width: '100%', padding: '13px 0', background: 'transparent', color: D.text, border: `1px solid ${D.border}`, borderRadius: BR, fontSize: 15, cursor: 'pointer', marginBottom: 16, fontFamily: F }}>
              {t.regenerate}
            </button>

            {/* Upsell */}
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: D.textMuted, margin: '0 0 8px', lineHeight: 1.5 }}>{t.upsell}</p>
              <span onClick={() => window.top.location.href = SHOP_CONFIG.originalPortraitUrl}
                style={{ fontSize: 14, color: D.text, fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}>
                {t.upsellLink}
              </span>
            </div>
          </div>
        )}

        {/* History */}
        {hist.length > 0 && (
          <button onClick={() => setShowHist(true)}
            style={{ width: '100%', padding: '12px 0', background: 'transparent', color: D.textDim, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: BR, fontSize: 14, cursor: 'pointer', fontFamily: F, marginTop: 16 }}>
            {t.history(hist.length)}
          </button>
        )}
      </div>
    </div>
  );
}
