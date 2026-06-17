import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { SHOP_CONFIG, DESIGN, TRANSLATIONS } from '../config';

const C = DESIGN.colors;
const R = DESIGN.borderRadius;

const RATIOS = {
  landscape: 297 / 210,
  portrait: 210 / 297,
};

function detectLang() {
  if (typeof window === 'undefined') return 'de';
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'en' || urlLang === 'de') return urlLang;
  const host = window.location.hostname;
  if (host.endsWith('.com') || host.endsWith('.co.uk') || host.endsWith('.us')) return 'en';
  if (host.endsWith('.de') || host.endsWith('.at') || host.endsWith('.ch')) return 'de';
  return navigator.language?.slice(0, 2) === 'de' ? 'de' : 'en';
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

export default function Home() {
  const [lang] = useState(() => detectLang());
  const t = TRANSLATIONS[lang];
  const [rawPreview, setRawPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [orientation, setOrientation] = useState('landscape');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const MAX = SHOP_CONFIG.maxPreviewsPerDay;

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setRawPreview(URL.createObjectURL(file));
    setShowCropModal(true);
    setCroppedPreview(null); setCroppedBlob(null);
    setResult(null); setCheckoutUrl(null); setError(null);
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
    setResult(null);
    setCheckoutUrl(null);
    setError(null);
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
      setResult(data.imageUrl);
      setCheckoutUrl(data.checkoutUrl);
      setCount(c => c + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const s = {
    container: { minHeight: '100vh', background: C.pageBg, padding: '16px 16px 32px', fontFamily: DESIGN.font, color: C.text, boxSizing: 'border-box' },
    title: { fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 4, textAlign: 'center' },
    subtitle: { color: C.textMuted, marginBottom: 4, fontSize: 13, textAlign: 'center', lineHeight: 1.5 },
    counter: { color: C.textDim, fontSize: 12, marginBottom: 16, textAlign: 'center' },
    uploadBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${C.border}`, borderRadius: R.upload, padding: 16, cursor: 'pointer', marginBottom: 10, minHeight: 130, overflow: 'hidden' },
    uploadPlaceholder: { textAlign: 'center', color: C.textDim },
    previewImg: { maxWidth: '100%', maxHeight: 180, borderRadius: 4 },
    reuploadBtn: { display: 'block', textAlign: 'center', color: C.textMuted, cursor: 'pointer', marginBottom: 12, fontSize: 13, textDecoration: 'underline' },
    btn: { width: '100%', padding: '14px 0', background: C.accent, color: C.accentText, border: 'none', borderRadius: R.btn, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10 },
    btnSecondary: { width: '100%', padding: '11px 0', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: R.btn, fontSize: 14, cursor: 'pointer', marginBottom: 10 },
    error: { color: C.error, textAlign: 'center', fontSize: 13, marginBottom: 10 },
    resultImg: { width: '100%', borderRadius: 4, display: 'block', marginBottom: 14 },
    buyBtn: { display: 'block', padding: '14px 0', background: C.buyBtn, color: C.buyBtnText, borderRadius: R.btn, textAlign: 'center', textDecoration: 'none', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    upsellNote: { textAlign: 'center', fontSize: 13, color: C.textDim, lineHeight: 1.5 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', display: 'flex', flexDirection: 'column', zIndex: 1000 },
    modalHeader: { padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#1a1a1a' },
    cropContainer: { position: 'relative', flex: 1, overflow: 'hidden' },
    modalFooter: { padding: '12px 16px', background: '#1a1a1a', flexShrink: 0 },
    sliderWrapper: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    sliderLabel: { fontSize: 13, color: '#aaa', whiteSpace: 'nowrap' },
    slider: { flex: 1, accentColor: '#fff' },
    modalButtons: { display: 'flex', gap: 10 },
    cancelBtn: { flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #555', color: '#aaa', borderRadius: R.btn, cursor: 'pointer', fontSize: 15 },
    saveBtn: { flex: 1, padding: '12px 0', background: '#fff', color: '#1a1a1a', border: 'none', borderRadius: R.btn, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' },
  };

  return (
    <div style={s.container}>
      {loading && <LoadingOverlay bgImage={croppedPreview} t={t} />}

      <h1 style={s.title}>{t.title}</h1>
      <p style={s.subtitle}>{t.subtitle}</p>
      <p style={s.counter}>{t.counter(count, MAX)}</p>

      {!result && (
        <>
          <label style={s.uploadBox}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
            {croppedPreview
              ? <img src={croppedPreview} alt="Cropped" style={s.previewImg} />
              : <div style={s.uploadPlaceholder}>
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
        </>
      )}

      {count >= MAX && <p style={s.error}>{t.limitReached(MAX)}</p>}
      {error && <p style={s.error}>{error}</p>}

      {result && (
        <div>
          <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{t.resultLabel}</p>
          <img src={result} alt="Portrait" style={s.resultImg} />
          {checkoutUrl && (
            <a href={checkoutUrl} style={s.buyBtn}>{t.buyBtn(SHOP_CONFIG.price)}</a>
          )}
          <button onClick={handleReset} style={s.btnSecondary}>{t.regenerate}</button>
          <p style={s.upsellNote}>
            {t.upsellText}<br />
            <a href={SHOP_CONFIG.originalPortraitUrl} style={{ color: C.text, textDecoration: 'underline', fontWeight: 'bold' }}>
              {t.upsellLink}
            </a>
          </p>
        </div>
      )}

      {/* Crop Modal — full screen */}
      {showCropModal && (
        <div style={s.modalOverlay}>
          {/* Header */}
          <div style={s.modalHeader}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{t.cropTitle}</span>
            {/* 1 nút nhỏ toggle ngang/dọc */}
            <button
              onClick={() => {
                setOrientation(o => o === 'landscape' ? 'portrait' : 'landscape');
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
              style={{ padding: '5px 12px', fontSize: 12, background: 'transparent', color: '#aaa', border: '1px solid #555', borderRadius: 4, cursor: 'pointer' }}
            >
              {orientation === 'landscape' ? '↕ Hochformat' : '↔ Querformat'}
            </button>
          </div>

          {/* Crop area — chiếm toàn bộ màn hình còn lại */}
          <div style={s.cropContainer}>
            <Cropper
              image={rawPreview}
              crop={crop}
              zoom={zoom}
              aspect={RATIOS[orientation]}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Footer */}
          <div style={s.modalFooter}>
            <div style={s.sliderWrapper}>
              <span style={s.sliderLabel}>{t.zoom}</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))} style={s.slider} />
            </div>
            <div style={s.modalButtons}>
              <button onClick={handleCancelCrop} style={s.cancelBtn}>{t.cropCancel}</button>
              <button onClick={handleSaveCrop} style={s.saveBtn}>{t.cropSave}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
