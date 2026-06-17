import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { SHOP_CONFIG, DESIGN, TRANSLATIONS } from '../config';

const C = DESIGN.colors;
const R = DESIGN.borderRadius;

const RATIOS = { landscape: 297 / 210, portrait: 210 / 297 };
const HISTORY_KEY = 'sketchus_portrait_history';
const MAX_HISTORY = 5;

function detectLang() {
  if (typeof window === 'undefined') return 'de';
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'en' || urlLang === 'de') return urlLang;
  const host = window.location.hostname;
  if (host.endsWith('.com') || host.endsWith('.co.uk') || host.endsWith('.us')) return 'en';
  if (host.endsWith('.de') || host.endsWith('.at') || host.endsWith('.ch')) return 'de';
  return navigator.language?.slice(0, 2) === 'de' ? 'de' : 'en';
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveToHistory(item) {
  try {
    const h = loadHistory();
    h.unshift(item);
    if (h.length > MAX_HISTORY) h.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {}
}

function getCroppedImg(imageSrc, croppedAreaPixels) {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const maxSize = 1024;
      let w = croppedAreaPixels.width, h = croppedAreaPixels.height;
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
  });
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

// Thêm vào giỏ hàng Shopify đúng cách qua /cart/add
async function addToCart(aiStoredUrl, originalStoredUrl) {
  const properties = { 'Portrait-Vorschau': aiStoredUrl };
  if (originalStoredUrl) properties['Originalfoto'] = originalStoredUrl;
  properties['Erstellt am'] = new Date().toLocaleString('de-DE');

  const res = await fetch(`https://${SHOP_CONFIG.shopDomain}/cart/add.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: SHOP_CONFIG.variantId,
      quantity: 1,
      properties,
    }),
  });
  if (!res.ok) throw new Error('Cart add failed');
  return `https://${SHOP_CONFIG.shopDomain}/checkout`;
}

function LoadingOverlay({ bgImage, t }) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    const totalMs = SHOP_CONFIG.estimatedLoadingMs;
    const interval = 200;
    const increment = (interval / totalMs) * 100;
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + increment, 95);
        if (next < 25) setStepIndex(0);
        else if (next < 55) setStepIndex(1);
        else if (next < 80) setStepIndex(2);
        else setStepIndex(3);
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,99,99,0.97)' }}>
      {bgImage && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(16px) brightness(0.2)', transform: 'scale(1.1)' }} />}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 380, width: '90%', textAlign: 'center', fontFamily: DESIGN.font, padding: '0 16px' }}>
        <p style={{ fontSize: 11, letterSpacing: 3, color: C.textDim, textTransform: 'uppercase', marginBottom: 12 }}>{t.loadingHeadline}</p>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 24 }}>{t.loadingSteps[stepIndex]}...</h2>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 3, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: 99, width: `${progress}%`, transition: 'width 0.2s ease' }} />
        </div>
        <div style={{ textAlign: 'left', marginBottom: 28 }}>
          {t.loadingSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center', color: i <= stepIndex ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                {i < stepIndex ? '✓' : i === stepIndex ? '●' : '○'}
              </span>
              <span style={{ fontSize: 14, color: i < stepIndex ? C.textMuted : i === stepIndex ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: i === stepIndex ? 'bold' : 'normal' }}>
                {step}
              </span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 20 }}>
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{t.loadingUpsell()}</p>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ history, onSelect, onClose, onBuy, t }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: C.pageBg, zIndex: 1500, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ color: C.text, fontWeight: 'bold', fontSize: 16 }}>{t.historyTitle} ({history.length})</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.textMuted, fontSize: 24, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {history.map((item, i) => (
          <div key={i} style={{ marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <img src={item.imageUrl} alt={`Portrait ${i + 1}`} style={{ width: '100%', display: 'block' }} />
            <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)' }}>
              <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 10px' }}>
                #{history.length - i} · {item.createdAt}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onSelect(item)}
                  style={{ flex: 1, padding: '10px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: R.btn, fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {t.historySelect}
                </button>
                <button
                  onClick={() => onBuy(item)}
                  style={{ flex: 1, padding: '10px 0', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: R.btn, fontSize: 14, cursor: 'pointer' }}
                >
                  {t.buyBtn(SHOP_CONFIG.price)}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [lang] = useState(() => detectLang());
  const t = TRANSLATIONS[lang];
  const [rawPreview, setRawPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [orientation, setOrientation] = useState('landscape');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [currentItem, setCurrentItem] = useState(null); // lưu full item hiện tại
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);
  const MAX = SHOP_CONFIG.maxPreviewsPerDay;

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    // KHÔNG tự load ảnh — để khách chủ động xem lịch sử
  }, []);

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setRawPreview(URL.createObjectURL(file));
    setShowCropModal(true);
    setCroppedPreview(null); setCroppedBlob(null);
    setResult(null); setCurrentItem(null); setError(null);
    setCrop({ x: 0, y: 0 }); setZoom(1);
  }

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  async function handleSaveCrop() {
    const blob = await getCroppedImg(rawPreview, croppedAreaPixels);
    setCroppedBlob(blob);
    setCroppedPreview(URL.createObjectURL(blob));
    setShowCropModal(false);
  }

  function handleCancelCrop() {
    setShowCropModal(false);
    if (!croppedPreview) setRawPreview(null);
  }

  function handleReset() {
    setResult(null); setCurrentItem(null); setError(null);
    setCroppedPreview(null); setCroppedBlob(null); setRawPreview(null);
  }

  function handleSelectFromHistory(item) {
    setResult(item.imageUrl);
    setCurrentItem(item);
    setShowHistory(false);
  }

  async function handleBuy(item) {
    setBuyLoading(true);
    try {
      const checkoutUrl = await addToCart(item.aiStoredUrl, item.originalStoredUrl);
      window.top.location.href = checkoutUrl;
    } catch (e) {
      alert('Fehler beim Hinzufügen zum Warenkorb. Bitte erneut versuchen.');
    } finally {
      setBuyLoading(false);
    }
  }

  async function handleGenerate() {
    if (!croppedBlob || count >= MAX) return;
    setLoading(true); setError(null);
    try {
      const base64 = await blobToBase64(croppedBlob);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, originalBase64: base64, orientation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorGeneric);

      const newItem = {
        imageUrl: data.imageUrl,
        aiStoredUrl: data.aiStoredUrl,
        originalStoredUrl: data.originalStoredUrl,
        createdAt: data.createdAt,
      };
      saveToHistory(newItem);
      setHistory(loadHistory());
      setResult(data.imageUrl);
      setCurrentItem(newItem);
      setCount(c => c + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const s = {
    container: { minHeight: '100vh', background: C.pageBg, padding: '16px 16px 40px', fontFamily: DESIGN.font, color: C.text, boxSizing: 'border-box' },
    title: { fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 4, textAlign: 'center' },
    subtitle: { color: C.textMuted, marginBottom: 4, fontSize: 13, textAlign: 'center', lineHeight: 1.5 },
    counter: { color: C.textDim, fontSize: 12, marginBottom: 16, textAlign: 'center' },
    uploadBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${C.border}`, borderRadius: R.upload, padding: 16, cursor: 'pointer', marginBottom: 10, minHeight: 130, overflow: 'hidden' },
    previewImg: { maxWidth: '100%', maxHeight: 180, borderRadius: 4 },
    reuploadBtn: { display: 'block', textAlign: 'center', color: C.textMuted, cursor: 'pointer', marginBottom: 12, fontSize: 13, textDecoration: 'underline' },
    btn: { width: '100%', padding: '14px 0', background: C.accent, color: C.accentText, border: 'none', borderRadius: R.btn, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10 },
    btnSecondary: { width: '100%', padding: '11px 0', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: R.btn, fontSize: 14, cursor: 'pointer', marginBottom: 10 },
    btnHistory: { width: '100%', padding: '10px 0', background: 'transparent', color: C.textDim, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: R.btn, fontSize: 13, cursor: 'pointer', marginBottom: 10 },
    buyBtn: { width: '100%', padding: '14px 0', background: C.buyBtn, color: C.buyBtnText, border: 'none', borderRadius: R.btn, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10 },
    error: { color: C.error, textAlign: 'center', fontSize: 13, marginBottom: 10 },
    resultImg: { width: '100%', borderRadius: 4, display: 'block', marginBottom: 14 },
    upsellNote: { textAlign: 'center', fontSize: 13, color: C.textDim, lineHeight: 1.5 },
  };

  return (
    <div style={s.container}>
      {loading && <LoadingOverlay bgImage={croppedPreview} t={t} />}
      {showHistory && (
        <HistoryPanel
          history={history}
          onSelect={handleSelectFromHistory}
          onClose={() => setShowHistory(false)}
          onBuy={handleBuy}
          t={t}
        />
      )}

      <h1 style={s.title}>{t.title}</h1>
      <p style={s.subtitle}>{t.subtitle}</p>
      <p style={s.counter}>{t.counter(count, MAX)}</p>

      {!result && (
        <>
          <label style={s.uploadBox}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
            {croppedPreview
              ? <img src={croppedPreview} alt="Cropped" style={s.previewImg} />
              : <div style={{ textAlign: 'center', color: C.textDim }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: C.textMuted }}>{t.upload}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>{t.uploadHint}</p>
                </div>
            }
          </label>

          {croppedPreview && (
            <label style={s.reuploadBtn}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
              {t.changePhoto}
            </label>
          )}

          <button
            onClick={handleGenerate}
            disabled={!croppedBlob || loading || count >= MAX}
            style={{ ...s.btn, opacity: (!croppedBlob || loading || count >= MAX) ? 0.5 : 1 }}
          >
            {loading ? t.generating : t.generate}
          </button>

          {history.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={s.btnHistory}>
              🕐 {t.historyBtn} ({history.length})
            </button>
          )}
        </>
      )}

      {count >= MAX && <p style={s.error}>{t.limitReached(MAX)}</p>}
      {error && <p style={s.error}>{error}</p>}

      {result && (
        <div>
          <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{t.resultLabel}</p>
          <img src={result} alt="Portrait" style={s.resultImg} />

          <button
            onClick={() => currentItem && handleBuy(currentItem)}
            disabled={buyLoading || !currentItem}
            style={{ ...s.buyBtn, opacity: buyLoading ? 0.7 : 1 }}
          >
            {buyLoading ? '...' : t.buyBtn(SHOP_CONFIG.price)}
          </button>

          <button onClick={handleReset} style={s.btnSecondary}>{t.regenerate}</button>

          {history.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={s.btnHistory}>
              🕐 {t.historyBtn} ({history.length})
            </button>
          )}

          <p style={s.upsellNote}>
            {t.upsellText}<br />
            <a
              href={SHOP_CONFIG.originalPortraitUrl}
              onClick={(e) => { e.preventDefault(); window.top.location.href = SHOP_CONFIG.originalPortraitUrl; }}
              style={{ color: C.text, textDecoration: 'underline', fontWeight: 'bold' }}
            >
              {t.upsellLink}
            </a>
          </p>
        </div>
      )}

      {showCropModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: C.pageBg, display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ color: C.text, fontSize: 15, fontWeight: 'bold' }}>{t.cropTitle}</span>
            <button
              onClick={() => { setOrientation(o => o === 'landscape' ? 'portrait' : 'landscape'); setCrop({ x: 0, y: 0 }); setZoom(1); }}
              style={{ padding: '5px 12px', fontSize: 12, background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer' }}
            >
              {orientation === 'landscape' ? '↕ Hochformat' : '↔ Querformat'}
            </button>
          </div>
          <div style={{ position: 'relative', height: 'calc(100vh - 200px)', background: '#4a4a4a', margin: '0 16px', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            <Cropper
              image={rawPreview} crop={crop} zoom={zoom}
              aspect={RATIOS[orientation]}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
            />
          </div>
          <div style={{ padding: '14px 16px 40px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap' }}>{t.zoom}</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: '#fff' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleCancelCrop} style={{ flex: 1, padding: '14px 0', background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: R.btn, cursor: 'pointer', fontSize: 15 }}>
                {t.cropCancel}
              </button>
              <button onClick={handleSaveCrop} style={{ flex: 1, padding: '14px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: R.btn, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
                {t.cropSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
