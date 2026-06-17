import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { SHOP_CONFIG, DESIGN, T } from '../config';

// ─── Constants ───────────────────────────────────────────────
const C = DESIGN.colors;
const HISTORY_KEY = 'sk_history_v2';
const MAX_HIST = 5;
const RATIOS = { landscape: 297 / 210, portrait: 210 / 297 };

// ─── Helpers ─────────────────────────────────────────────────
function getLang() {
  if (typeof window === 'undefined') return 'de';
  const p = new URLSearchParams(window.location.search).get('lang');
  if (p === 'de' || p === 'en') return p;
  const h = window.location.hostname;
  if (h.endsWith('.com') || h.endsWith('.co.uk')) return 'en';
  const nav = navigator.language?.slice(0, 2);
  return nav === 'en' ? 'en' : 'de';
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
      if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
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

// Thêm vào giỏ hàng Shopify — dùng /cart/add.js (không lỗi properties)
async function shopifyAddToCart(aiUrl, origUrl) {
  const properties = { 'Portrait-Vorschau': aiUrl };
  if (origUrl) properties['Originalfoto'] = origUrl;
  properties['Erstellt am'] = new Date().toLocaleString('de-DE');

  const r = await fetch(`https://${SHOP_CONFIG.shopDomain}/cart/add.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: Number(SHOP_CONFIG.variantId),
      quantity: 1,
      properties,
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.description || 'Cart error');
  }
  return `https://${SHOP_CONFIG.shopDomain}/checkout`;
}

// ─── Loading Overlay ─────────────────────────────────────────
function LoadingOverlay({ bg, t }) {
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ms = SHOP_CONFIG.estimatedLoadingMs;
    const tick = 250;
    const inc = (tick / ms) * 100;
    const id = setInterval(() => {
      setPct(p => {
        const n = Math.min(p + inc, 95);
        setStep(n < 25 ? 0 : n < 55 ? 1 : n < 80 ? 2 : 3);
        return n;
      });
    }, tick);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(80,80,80,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {bg && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.15)', transform: 'scale(1.1)' }} />}
      <div style={{ position: 'relative', width: '88%', maxWidth: 360, textAlign: 'center', color: '#fff', fontFamily: DESIGN.font }}>
        <p style={{ fontSize: 10, letterSpacing: 3, color: C.textDim, textTransform: 'uppercase', marginBottom: 10 }}>{t.loadingHeadline}</p>
        <h2 style={{ fontSize: 19, fontWeight: 'bold', marginBottom: 20 }}>{t.loadingSteps[step]}…</h2>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', width: `${pct}%`, transition: 'width 0.25s' }} />
        </div>
        {t.loadingSteps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textAlign: 'left' }}>
            <span style={{ width: 18, textAlign: 'center', fontSize: 13, color: i <= step ? '#fff' : 'rgba(255,255,255,0.25)' }}>
              {i < step ? '✓' : i === step ? '●' : '○'}
            </span>
            <span style={{ fontSize: 13, color: i < step ? C.textMuted : i === step ? '#fff' : 'rgba(255,255,255,0.25)', fontWeight: i === step ? 'bold' : 'normal' }}>{s}</span>
          </div>
        ))}
        <p style={{ fontSize: 12, color: C.textDim, marginTop: 20, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>{t.loadingNote}</p>
      </div>
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────
function HistoryPanel({ items, onSelect, onOrder, onClose, t }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: C.pageBg, display: 'flex', flexDirection: 'column', fontFamily: DESIGN.font }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ color: C.text, fontWeight: 'bold', fontSize: 16 }}>{t.historyTitle} ({items.length})</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {items.map((item, i) => (
          <div key={i} style={{ marginBottom: 20, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <img src={item.imageUrl} alt="" style={{ width: '100%', display: 'block' }} />
            <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)' }}>
              <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 10px' }}>#{items.length - i} · {item.createdAt}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onSelect(item)} style={{ flex: 1, padding: '11px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: DESIGN.btn, fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>
                  {t.historySelect}
                </button>
                <button onClick={() => onOrder(item)} style={{ flex: 1, padding: '11px 0', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: DESIGN.btn, fontSize: 14, cursor: 'pointer' }}>
                  {t.historyOrder(SHOP_CONFIG.price)}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function App() {
  const lang = useRef(getLang()).current;
  const t = T[lang];

  // Upload & crop
  const [rawSrc, setRawSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [orient, setOrient] = useState('landscape');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPx, setCropPx] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);

  // Result
  const [result, setResult] = useState(null);   // { imageUrl, aiStoredUrl, origStoredUrl }
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const MAX = SHOP_CONFIG.maxPreviewsPerDay;

  useEffect(() => { setHistory(readHistory()); }, []);

  // ── Upload
  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setRawSrc(URL.createObjectURL(f));
    setPreviewSrc(null); setPreviewBlob(null);
    setResult(null); setError(null);
    setCrop({ x: 0, y: 0 }); setZoom(1);
    setShowCrop(true);
  }

  // ── Crop
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

  function toggleOrient() {
    setOrient(o => o === 'landscape' ? 'portrait' : 'landscape');
    setCrop({ x: 0, y: 0 }); setZoom(1);
  }

  // ── Generate
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

      const item = {
        imageUrl: data.imageUrl,
        aiStoredUrl: data.aiStoredUrl,
        origStoredUrl: data.origStoredUrl,
        createdAt: new Date().toLocaleString('de-DE'),
      };
      pushHistory(item);
      setHistory(readHistory());
      setResult(item);
      setCount(c => c + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Buy
  async function buy(item) {
    setBuyLoading(true); setError(null);
    try {
      const url = await shopifyAddToCart(item.aiStoredUrl, item.origStoredUrl);
      window.top.location.href = url;
    } catch (e) {
      setError(t.cartError + ' (' + e.message + ')');
      setBuyLoading(false);
    }
  }

  // ── Reset
  function reset() {
    setResult(null); setError(null);
    setPreviewSrc(null); setPreviewBlob(null); setRawSrc(null);
  }

  // ── Styles
  const btn = (bg, color, border) => ({
    width: '100%', padding: '14px 0', background: bg, color,
    border: border || 'none', borderRadius: DESIGN.btn,
    fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10,
    fontFamily: DESIGN.font,
  });

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, padding: '18px 16px 48px', fontFamily: DESIGN.font, color: C.text, boxSizing: 'border-box' }}>

      {loading && <LoadingOverlay bg={previewSrc} t={t} />}
      {showHistory && (
        <HistoryPanel
          items={history}
          onSelect={item => { setResult(item); setShowHistory(false); }}
          onOrder={item => { setShowHistory(false); buy(item); }}
          onClose={() => setShowHistory(false)}
          t={t}
        />
      )}

      {/* Header */}
      <h1 style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>{t.title}</h1>
      <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 4, lineHeight: 1.5 }}>{t.subtitle}</p>
      <p style={{ fontSize: 12, color: C.textDim, textAlign: 'center', marginBottom: 18 }}>{t.counter(count, MAX)}</p>

      {/* Upload + Generate — ẩn khi có result */}
      {!result && (
        <>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${C.border}`, borderRadius: 4, minHeight: 140, cursor: 'pointer', marginBottom: 10, overflow: 'hidden' }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
            {previewSrc
              ? <img src={previewSrc} alt="" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }} />
              : <div style={{ textAlign: 'center', color: C.textDim, padding: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: C.textMuted }}>{t.upload}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>{t.uploadHint}</p>
                </div>
            }
          </label>

          {previewSrc && (
            <label style={{ display: 'block', textAlign: 'center', color: C.textMuted, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', marginBottom: 12 }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
              {t.changePhoto}
            </label>
          )}

          <button onClick={generate} disabled={!previewBlob || loading || count >= MAX}
            style={{ ...btn('#fff', '#1a1a1a'), opacity: (!previewBlob || loading || count >= MAX) ? 0.45 : 1 }}>
            {t.generate}
          </button>

          {count >= MAX && <p style={{ color: C.error, textAlign: 'center', fontSize: 13, marginBottom: 10 }}>{t.limitReached(MAX)}</p>}
          {error && <p style={{ color: C.error, textAlign: 'center', fontSize: 13, marginBottom: 10 }}>{error}</p>}

          {history.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={{ ...btn('transparent', C.textDim, `1px solid rgba(255,255,255,0.2)`), fontWeight: 'normal', fontSize: 14 }}>
              {t.historyBtn(history.length)}
            </button>
          )}
        </>
      )}

      {/* Result */}
      {result && (
        <>
          <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 10 }}>{t.resultLabel}</p>
          <img src={result.imageUrl} alt="Portrait" style={{ width: '100%', borderRadius: 4, display: 'block', marginBottom: 14 }} />

          {error && <p style={{ color: C.error, textAlign: 'center', fontSize: 13, marginBottom: 10 }}>{error}</p>}

          <button onClick={() => buy(result)} disabled={buyLoading}
            style={{ ...btn('#fff', '#1a1a1a'), opacity: buyLoading ? 0.6 : 1 }}>
            {buyLoading ? t.buyLoading : t.buyBtn(SHOP_CONFIG.price)}
          </button>

          <button onClick={reset} style={btn('transparent', C.text, `1px solid ${C.border}`)}>
            {t.regenerate}
          </button>

          {history.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={{ ...btn('transparent', C.textDim, `1px solid rgba(255,255,255,0.2)`), fontWeight: 'normal', fontSize: 14 }}>
              {t.historyBtn(history.length)}
            </button>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: C.textDim, lineHeight: 1.6, marginTop: 4 }}>
            {t.upsellText}<br />
            <span
              onClick={() => window.top.location.href = SHOP_CONFIG.originalPortraitUrl}
              style={{ color: C.text, textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {t.upsellLink}
            </span>
          </p>
        </>
      )}

      {/* Crop Modal — full screen, cùng màu nền */}
      {showCrop && (
        <div style={{ position: 'fixed', inset: 0, background: C.pageBg, display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ color: C.text, fontSize: 15, fontWeight: 'bold' }}>{t.cropTitle}</span>
            <button onClick={toggleOrient} style={{ padding: '6px 14px', fontSize: 12, background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer' }}>
              {orient === 'landscape' ? t.toPortrait : t.toLandscape}
            </button>
          </div>

          {/* Crop area — để lại 180px cho footer */}
          <div style={{ position: 'relative', flex: 1, margin: '0 16px', borderRadius: 8, overflow: 'hidden', background: '#3a3a3a', minHeight: 0 }}>
            <Cropper
              image={rawSrc} crop={crop} zoom={zoom}
              aspect={RATIOS[orient]}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropDone}
            />
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 16px 36px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap' }}>{t.zoom}</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#fff' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={cancelCrop} style={{ flex: 1, padding: '14px 0', background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: DESIGN.btn, cursor: 'pointer', fontSize: 15 }}>
                {t.cropCancel}
              </button>
              <button onClick={saveCrop} style={{ flex: 1, padding: '14px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: DESIGN.btn, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
                {t.cropSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
