import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { SHOP_CONFIG, DESIGN, TRANSLATIONS } from '../config';

const C = DESIGN.colors;
const R = DESIGN.borderRadius;

function detectLang() {
  if (typeof window === 'undefined') return 'de';
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'en' || urlLang === 'de') return urlLang;
  const host = window.location.hostname;
  if (host.endsWith('.com') || host.endsWith('.co.uk') || host.endsWith('.us')) return 'en';
  if (host.endsWith('.de') || host.endsWith('.at') || host.endsWith('.ch')) return 'de';
  const browserLang = navigator.language?.slice(0, 2);
  return browserLang === 'de' ? 'de' : 'en';
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
  });
}

function cropToRatio(imageSrc, ratio) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      const srcW = image.width, srcH = image.height;
      let cropW, cropH, offsetX, offsetY;
      if (srcW / srcH > ratio) {
        cropH = srcH; cropW = Math.round(srcH * ratio);
        offsetX = Math.round((srcW - cropW) / 2); offsetY = 0;
      } else {
        cropW = srcW; cropH = Math.round(srcW / ratio);
        offsetX = 0; offsetY = Math.round((srcH - cropH) / 2);
      }
      const canvas = document.createElement('canvas');
      canvas.width = cropW; canvas.height = cropH;
      canvas.getContext('2d').drawImage(image, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL('image/png'));
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {bgImage && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px) brightness(0.15)', transform: 'scale(1.1)' }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.97)', borderRadius: 8, padding: '40px 48px', maxWidth: 480, width: '90%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.15)', fontFamily: DESIGN.font }}>
        <p style={{ fontSize: 11, letterSpacing: 3, color: '#999', textTransform: 'uppercase', marginBottom: 12 }}>{t.loadingHeadline}</p>
        <h2 style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 24 }}>{t.loadingSteps[stepIndex]}...</h2>

        {/* Progress bar */}
        <div style={{ background: '#eee', borderRadius: 99, height: 4, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1a1a1a', borderRadius: 99, width: `${progress}%`, transition: 'width 0.2s ease' }} />
        </div>

        {/* Steps */}
        <div style={{ textAlign: 'left', marginBottom: 28 }}>
          {t.loadingSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center', color: i < stepIndex ? '#1a1a1a' : i === stepIndex ? '#1a1a1a' : '#ccc' }}>
                {i < stepIndex ? '✓' : i === stepIndex ? '●' : '○'}
              </span>
              <span style={{ fontSize: 14, color: i < stepIndex ? '#666' : i === stepIndex ? '#1a1a1a' : '#bbb', fontWeight: i === stepIndex ? 'bold' : 'normal' }}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Upsell */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            {t.loadingUpsell('Sketchus')}
          </p>
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

  async function handleGenerate() {
    if (!croppedBlob || count >= MAX) return;
    setLoading(true); setError(null);
    try {
      const base64 = await blobToBase64(croppedBlob);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, originalBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorGeneric);
      const a4Image = await cropToRatio(data.imageUrl, SHOP_CONFIG.imageAspectRatio);
      setResult(a4Image);
      setCheckoutUrl(data.checkoutUrl);
      setCount(c => c + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const s = {
    container: { minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: DESIGN.font },
    card: { background: C.cardBg, borderRadius: R.card, padding: 40, maxWidth: 650, width: '100%', color: C.text, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
    title: { textAlign: 'center', fontSize: 28, color: C.accent, marginBottom: 8 },
    subtitle: { textAlign: 'center', color: C.textMuted, marginBottom: 8, fontSize: 14 },
    counter: { textAlign: 'center', color: C.textDim, fontSize: 13, marginBottom: 24 },
    uploadBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${C.border}`, borderRadius: R.upload, padding: 20, cursor: 'pointer', marginBottom: 12, minHeight: 180, overflow: 'hidden' },
    uploadPlaceholder: { textAlign: 'center', color: '#666' },
    previewImg: { maxWidth: '100%', maxHeight: 250, borderRadius: 8 },
    reuploadBtn: { display: 'block', textAlign: 'center', color: C.linkColor, cursor: 'pointer', marginBottom: 16, fontSize: 14 },
    btn: { width: '100%', padding: '14px 0', background: C.accent, color: C.accentText, border: 'none', borderRadius: R.btn, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16 },
    error: { color: C.error, textAlign: 'center' },
    resultLabel: { color: C.textMuted, fontSize: 13, marginBottom: 8 },
    watermarkWrapper: { position: 'relative', display: 'inline-block', width: '100%' },
    resultImg: { width: '100%', borderRadius: 8, display: 'block', aspectRatio: `${SHOP_CONFIG.imageAspectRatio}` },
    watermark: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontSize: 36, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap' },
    sizeNote: { color: C.textDim, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 16 },
    buyBtn: { display: 'block', padding: '16px 0', background: C.buyBtn, color: C.buyBtnText, borderRadius: R.btn, textAlign: 'center', textDecoration: 'none', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    upsellNote: { textAlign: 'center', fontSize: 13, color: C.textDim, marginTop: 8 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalBox: { background: C.cardBg, borderRadius: R.modal, padding: 24, width: '90%', maxWidth: 700, color: C.text },
    modalTitle: { textAlign: 'center', marginBottom: 16, color: C.accent, fontSize: 20 },
    cropContainer: { position: 'relative', width: '100%', height: 380, background: '#000', borderRadius: 8, overflow: 'hidden' },
    sliderWrapper: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 16 },
    sliderLabel: { fontSize: 14, color: C.textMuted, whiteSpace: 'nowrap' },
    slider: { flex: 1, accentColor: C.accent },
    modalButtons: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
    cancelBtn: { padding: '10px 24px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: R.btn, cursor: 'pointer', fontSize: 16 },
    saveBtn: { padding: '10px 24px', background: C.accent, color: C.accentText, border: 'none', borderRadius: R.btn, cursor: 'pointer', fontSize: 16, fontWeight: 'bold' },
  };

  return (
    <div style={s.container}>
      {loading && <LoadingOverlay bgImage={croppedPreview} t={t} />}
      <div style={s.card}>
        <h1 style={s.title}>{t.title}</h1>
        <p style={s.subtitle}>{t.subtitle}</p>
        <p style={s.counter}>{t.counter(count, MAX)}</p>

        <label style={s.uploadBox}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
          {croppedPreview
            ? <img src={croppedPreview} alt="Cropped" style={s.previewImg} />
            : <div style={s.uploadPlaceholder}>
                <span style={{ fontSize: 48 }}>📷</span>
                <p>{t.upload}</p>
                <p style={{ fontSize: 12, color: '#555' }}>{t.uploadHint}</p>
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

        {count >= MAX && <p style={s.error}>{t.limitReached(MAX)}</p>}
        {error && <p style={s.error}>{error}</p>}

        {result && (
          <div style={{ marginTop: 24 }}>
            <p style={s.resultLabel}>{t.resultLabel}</p>
            <div style={s.watermarkWrapper}>
              <img src={result} alt="Portrait" style={s.resultImg} />
              <div style={s.watermark}>© Sketchus</div>
            </div>
            <p style={s.sizeNote}>{t.sizeNote}</p>
            {checkoutUrl && (
              <a href={checkoutUrl} style={s.buyBtn}>{t.buyBtn(SHOP_CONFIG.price)}</a>
            )}
            <p style={s.upsellNote}>
              {t.upsellText}{' '}
              <a href={SHOP_CONFIG.originalPortraitUrl} style={{ color: C.accent }}>{t.upsellLink}</a>
            </p>
          </div>
        )}
      </div>

      {showCropModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitle}>{t.cropTitle}</h2>
            <div style={s.cropContainer}>
              <Cropper
                image={rawPreview} crop={crop} zoom={zoom}
                aspect={SHOP_CONFIG.imageAspectRatio}
                onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
              />
            </div>
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
