import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { SHOP_CONFIG, DESIGN, T } from '../config';

const C = DESIGN.colors;
const HISTORY_KEY = 'sk_history_v3';
const MAX_HIST = 5;
const RATIOS = { landscape: 297 / 210, portrait: 210 / 297 };

function getLang() {
  if (typeof window === 'undefined') return 'de';
  const p = new URLSearchParams(window.location.search).get('lang');
  if (p === 'de' || p === 'en') return p;
  return navigator.language?.slice(0, 2) === 'en' ? 'en' : 'de';
}

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function pushHistory(item) {
  try {
    const h = readHistory();
    h.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HIST)));
  } catch {}
}

function cropImage(src, pixels) {
  return new Promise(resolve => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const MAX = 1024;
      let w = pixels.width, h = pixels.height;
      if (w > MAX || h > MAX) { const r = Math.min(MAX/w, MAX/h); w = Math.round(w*r); h = Math.round(h*r); }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, w, h);
      c.toBlob(b => resolve(b), 'image/jpeg', 0.9);
    };
  });
}

function toBase64(blob) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result.split(',')[1]);
    r.readAsDataURL(blob);
  });
}

// Gọi qua Vercel proxy — tránh CORS
async function addToCart(aiStoredUrl, origStoredUrl) {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variantId: SHOP_CONFIG.variantId,
      aiStoredUrl,
      origStoredUrl: origStoredUrl || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Cart error');
  return data.checkoutUrl;
}

function LoadingOverlay({ bg, t }) {
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const tick = 250;
    const inc = (tick / SHOP_CONFIG.estimatedLoadingMs) * 100;
    const id = setInterval(() => {
      setPct(p => { const n = Math.min(p + inc, 95); setStep(n < 25 ? 0 : n < 55 ? 1 : n < 80 ? 2 : 3); return n; });
    }, tick);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(70,70,70,0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {bg && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.15)', transform: 'scale(1.1)' }} />}
      <div style={{ position: 'relative', width: '88%', maxWidth: 340, textAlign: 'center', color: '#fff', fontFamily: DESIGN.font }}>
        <p style={{ fontSize: 10, letterSpacing: 3, color: C.textDim, textTransform: 'uppercase', marginBottom: 10 }}>{t.loadingHeadline}</p>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>{t.loadingSteps[step]}…</h2>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 3, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', width: `${pct}%`, transition: 'width 0.25s', borderRadius: 99 }} />
        </div>
        {t.loadingSteps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textAlign: 'left' }}>
            <span style={{ width: 18, textAlign: 'center', fontSize: 12, color: i <= step ? '#fff' : 'rgba(255,255,255,0.2)' }}>
              {i < step ? '✓' : i === step ? '●' : '○'}
            </span>
            <span style={{ fontSize: 13, color: i === step ? '#fff' : i < step ? C.textMuted : 'rgba(255,255,255,0.2)', fontWeight: i === step ? 'bold' : 'normal' }}>{s}</span>
          </div>
        ))}
        <p style={{ fontSize: 12, color: C.textDim, marginTop: 20, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>{t.loadingNote}</p>
      </div>
    </div>
  );
}

export default function App() {
  const lang = useRef(getLang()).current;
  const t = T[lang];

  const [rawSrc, setRawSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [orient, setOrient] = useState('landscape');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPx, setCropPx] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);

  const MAX = SHOP_CONFIG.maxPreviewsPerDay;

  useEffect(() => { setHistory(readHistory()); }, []);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setRawSrc(URL.createObjectURL(f));
    setPreviewSrc(null); setPreviewBlob(null);
    setResult(null); setError(null);
    setCrop({ x: 0, y: 0 }); setZoom(1);
    setShowCrop(true);
  }

  const onCropDone = useCallback((_, px) => setCropPx(px), []);

  async function saveCrop() {
    const blob = await cropImage(rawSrc, cropPx);
    setPreviewBlob(blob);
    setPreviewSrc(URL.createObjectURL(blob));
    setShowCrop(false);
  }

  function cancelCrop() {
    setShowCrop(false);
    if (!previewSrc) setRawSrc(null);
  }

  async function generate() {
    if (!previewBlob || count >= MAX) return;
    setLoading(true); setError(null);
    try {
      const b64 = await toBase64(previewBlob);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, originalBase64: b64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.error);
      const item = { imageUrl: data.imageUrl, aiStoredUrl: data.aiStoredUrl, origStoredUrl: data.origStoredUrl, createdAt: new Date().toLocaleString('de-DE') };
      pushHistory(item);
      setHistory(readHistory());
      setResult(item);
      setCount(c => c + 1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function buy(item) {
    setBuyLoading(true); setError(null);
    try {
      const url = await addToCart(item.aiStoredUrl, item.origStoredUrl);
      window.top.location.href = url;
    } catch (e) {
      setError(t.cartError);
      setBuyLoading(false);
    }
  }

  function reset() {
    setResult(null); setError(null);
    setPreviewSrc(null); setPreviewBlob(null); setRawSrc(null);
  }

  const F = DESIGN.font;
  const BR = DESIGN.btn;

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, fontFamily: F, color: C.text, boxSizing: 'border-box' }}>
      {loading && <LoadingOverlay bg={previewSrc} t={t} />}

      {/* ── History Panel ── */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: C.pageBg, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{t.historyTitle} ({history.length})</span>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 26, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {history.map((item, i) => (
              <div key={i} style={{ marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
                <img src={item.imageUrl} alt="" style={{ width: '100%', display: 'block' }} />
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 10px' }}>#{history.length - i} · {item.createdAt}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setResult(item); setShowHistory(false); }}
                      style={{ flex: 1, padding: '11px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: BR, fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>
                      {t.historySelect}
                    </button>
                    <button onClick={() => { setShowHistory(false); buy(item); }}
                      style={{ flex: 1, padding: '11px 0', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: BR, fontSize: 14, cursor: 'pointer' }}>
                      {t.historyOrder(SHOP_CONFIG.price)}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Crop Modal ── */}
      {showCrop && (
        <div style={{ position: 'fixed', inset: 0, background: C.pageBg, display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 'bold' }}>{t.cropTitle}</span>
            <button onClick={() => { setOrient(o => o === 'landscape' ? 'portrait' : 'landscape'); setCrop({ x: 0, y: 0 }); setZoom(1); }}
              style={{ padding: '6px 14px', fontSize: 12, background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer' }}>
              {orient === 'landscape' ? t.toPortrait : t.toLandscape}
            </button>
          </div>
          <div style={{ position: 'relative', flex: 1, margin: '0 16px', borderRadius: 8, overflow: 'hidden', background: '#3a3a3a', minHeight: 0 }}>
            <Cropper image={rawSrc} crop={crop} zoom={zoom} aspect={RATIOS[orient]}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropDone} />
          </div>
          <div style={{ padding: '14px 16px 36px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap' }}>{t.zoom}</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#fff' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={cancelCrop} style={{ flex: 1, padding: '14px 0', background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: BR, cursor: 'pointer', fontSize: 15 }}>{t.cropCancel}</button>
              <button onClick={saveCrop} style={{ flex: 1, padding: '14px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: BR, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>{t.cropSave}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main UI ── */}
      <div style={{ padding: '20px 16px 48px' }}>

        {/* Header */}
        <h1 style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>{t.title}</h1>
        <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 4, lineHeight: 1.5 }}>{t.subtitle}</p>
        <p style={{ fontSize: 12, color: C.textDim, textAlign: 'center', marginBottom: 24 }}>{t.counter(count, MAX)}</p>

        {/* ── STEP 1: Upload ── */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, color: C.textDim, textTransform: 'uppercase', marginBottom: 10 }}>① {lang === 'de' ? 'Foto hochladen' : 'Upload photo'}</p>

          {/* Upload box */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, cursor: 'pointer', minHeight: 80 }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
            {previewSrc
              ? <img src={previewSrc} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              : <div style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📷</div>
            }
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', color: C.text, fontSize: 14 }}>{previewSrc ? t.changePhoto : t.upload}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>{t.uploadHint}</p>
            </div>
          </label>
        </div>

        {/* ── STEP 2: Generate ── */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, color: C.textDim, textTransform: 'uppercase', marginBottom: 10 }}>② {lang === 'de' ? 'Vorschau erstellen' : 'Create preview'}</p>

          <button onClick={generate} disabled={!previewBlob || loading || count >= MAX}
            style={{ width: '100%', padding: '15px 0', background: previewBlob && count < MAX ? '#fff' : 'rgba(255,255,255,0.3)', color: '#1a1a1a', border: 'none', borderRadius: BR, fontSize: 16, fontWeight: 'bold', cursor: previewBlob && count < MAX ? 'pointer' : 'not-allowed', marginBottom: 0, fontFamily: F }}>
            {t.generate}
          </button>

          {count >= MAX && <p style={{ color: C.error, textAlign: 'center', fontSize: 13, marginTop: 8 }}>{t.limitReached(MAX)}</p>}
          {error && <p style={{ color: C.error, textAlign: 'center', fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>

        {/* ── STEP 3: Result ── */}
        {result && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, letterSpacing: 2, color: C.textDim, textTransform: 'uppercase', marginBottom: 10 }}>③ {lang === 'de' ? 'Dein Portrait' : 'Your portrait'}</p>

            {/* Ảnh kết quả */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
              <img src={result.imageUrl} alt="Portrait" style={{ width: '100%', display: 'block' }} />
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{result.createdAt}</span>
                <span style={{ fontSize: 12, color: C.textDim }}>✓ {lang === 'de' ? 'Automatisch erstellt' : 'Auto generated'}</span>
              </div>
            </div>

            {/* Nút mua */}
            <button onClick={() => buy(result)} disabled={buyLoading}
              style={{ width: '100%', padding: '15px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: BR, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10, fontFamily: F, opacity: buyLoading ? 0.6 : 1 }}>
              {buyLoading ? t.buyLoading : t.buyBtn(SHOP_CONFIG.price)}
            </button>

            {/* Nút tạo lại */}
            <button onClick={reset}
              style={{ width: '100%', padding: '13px 0', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: BR, fontSize: 15, cursor: 'pointer', marginBottom: 10, fontFamily: F }}>
              {t.regenerate}
            </button>

            {/* Upsell */}
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 8px', lineHeight: 1.5 }}>{t.upsellText}</p>
              <span onClick={() => window.top.location.href = SHOP_CONFIG.originalPortraitUrl}
                style={{ fontSize: 14, color: '#fff', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}>
                {t.upsellLink}
              </span>
            </div>
          </div>
        )}

        {/* ── History button ── */}
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)}
            style={{ width: '100%', padding: '12px 0', background: 'transparent', color: C.textDim, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: BR, fontSize: 14, cursor: 'pointer', fontFamily: F }}>
            {t.historyBtn(history.length)}
          </button>
        )}
      </div>
    </div>
  );
}
