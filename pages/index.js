import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';

const A4_RATIO = 297 / 210;

const LOADING_STEPS = [
  'Details werden analysiert',
  'Skizze wird erstellt',
  'Komposition wird optimiert',
  'Finalisierung',
];

function getCroppedImg(imageSrc, croppedAreaPixels) {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const maxSize = 1024;
      let w = croppedAreaPixels.width;
      let h = croppedAreaPixels.height;
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
  });
}

function cropToA4(imageSrc) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      const srcW = image.width;
      const srcH = image.height;
      let cropW, cropH, offsetX, offsetY;
      if (srcW / srcH > A4_RATIO) {
        cropH = srcH;
        cropW = Math.round(srcH * A4_RATIO);
        offsetX = Math.round((srcW - cropW) / 2);
        offsetY = 0;
      } else {
        cropW = srcW;
        cropH = Math.round(srcW / A4_RATIO);
        offsetX = 0;
        offsetY = Math.round((srcH - cropH) / 2);
      }
      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH);
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

function LoadingOverlay({ bgImage }) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Progress bar: 90 giây tổng (AI thường mất 30-60s)
    const totalMs = 55000;
    const interval = 200;
    const increment = (interval / totalMs) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + increment, 95);
        // Cập nhật step dựa theo progress
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
    <div style={overlay.backdrop}>
      {/* Blurred background image */}
      {bgImage && (
        <div style={{
          ...overlay.bgImg,
          backgroundImage: `url(${bgImage})`,
        }} />
      )}
      <div style={overlay.box}>
        <p style={overlay.topLabel}>WIR ERSTELLEN DEIN KUNSTWERK</p>
        <h2 style={overlay.title}>{LOADING_STEPS[stepIndex]}...</h2>

        {/* Progress bar */}
        <div style={overlay.barTrack}>
          <div style={{ ...overlay.barFill, width: `${progress}%` }} />
        </div>

        {/* Steps */}
        <div style={overlay.steps}>
          {LOADING_STEPS.map((step, i) => (
            <div key={i} style={overlay.stepRow}>
              <span style={{
                ...overlay.stepIcon,
                color: i < stepIndex ? '#fff' : i === stepIndex ? '#f0c040' : '#666',
              }}>
                {i < stepIndex ? '✓' : i === stepIndex ? '●' : '○'}
              </span>
              <span style={{
                ...overlay.stepText,
                color: i < stepIndex ? '#ccc' : i === stepIndex ? '#fff' : '#555',
                fontWeight: i === stepIndex ? 'bold' : 'normal',
              }}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Upsell text */}
        <div style={overlay.upsell}>
          <p style={overlay.upsellText}>
            Dieser Entwurf wird automatisch aus 1 Foto erstellt.<br />
            <strong>Mehrere Vorlagen?</strong> Dann lass echte Künstler dein{' '}
<span style={{ color: '#f0c040' }}>handgezeichnetes Portrait</span> erstellen.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [rawPreview, setRawPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const MAX = 10;

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setRawPreview(URL.createObjectURL(file));
    setShowCropModal(true);
    setCroppedPreview(null);
    setCroppedBlob(null);
    setResult(null);
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
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
    setLoading(true);
    setError(null);
    try {
      const base64 = await blobToBase64(croppedBlob);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler');
      const a4Image = await cropToA4(data.imageUrl);
      setResult(a4Image);
      setCount(c => c + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {loading && <LoadingOverlay bgImage={croppedPreview} />}

      <div style={styles.card}>
        <h1 style={styles.title}>✏️ Bleistift-Portrait Generator</h1>
        <p style={styles.subtitle}>Lade dein Foto hoch und erhalte ein künstlerisches Bleistift-Portrait</p>
        <p style={styles.counter}>{count} von {MAX} Vorschauen heute verwendet</p>

        <label style={styles.uploadBox}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
          {croppedPreview
            ? <img src={croppedPreview} alt="Cropped" style={styles.previewImg} />
            : <div style={styles.uploadPlaceholder}>
                <span style={{ fontSize: 48 }}>📷</span>
                <p>Foto hochladen (JPG, PNG, WEBP)</p>
                <p style={{ fontSize: 12, color: '#555' }}>Klicken oder Bild hierher ziehen</p>
              </div>
          }
        </label>

        {croppedPreview && (
          <label style={styles.reuploadBtn}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
            🔄 Anderes Foto wählen
          </label>
        )}

        <button
          onClick={handleGenerate}
          disabled={!croppedBlob || loading || count >= MAX}
          style={{ ...styles.btn, opacity: (!croppedBlob || loading || count >= MAX) ? 0.5 : 1 }}
        >
          {loading ? '⏳ Wird erstellt...' : '✏️ Portrait erstellen'}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        {result && (
          <div style={styles.resultBox}>
            <p style={styles.resultLabel}>Vorschau (A4 Querformat) mit Wasserzeichen:</p>
            <div style={styles.watermarkWrapper}>
              <img src={result} alt="Portrait A4" style={{ ...styles.resultImg, aspectRatio: '297/210' }} />
              <div style={styles.watermark}>© Sketchus</div>
            </div>
            <p style={styles.sizeNote}>📐 Format: A4 Querformat (297 × 210 mm)</p>
            <a href="https://sketchus.de/products/bleistift-portrait" style={styles.buyBtn}>
              🛒 Vollbild kaufen für €9,99
            </a>
          </div>
        )}
      </div>

      {showCropModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h2 style={styles.modalTitle}>Bild zuschneiden</h2>
            <div style={styles.cropContainer}>
              <Cropper
                image={rawPreview}
                crop={crop}
                zoom={zoom}
                aspect={A4_RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div style={styles.sliderWrapper}>
              <span style={styles.sliderLabel}>🔍 Zoom</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))} style={styles.slider} />
            </div>
            <div style={styles.modalButtons}>
              <button onClick={handleCancelCrop} style={styles.cancelBtn}>Abbrechen</button>
              <button onClick={handleSaveCrop} style={styles.saveBtn}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Georgia, serif' },
  card: { background: '#16213e', borderRadius: 16, padding: 40, maxWidth: 650, width: '100%', color: '#eee', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  title: { textAlign: 'center', fontSize: 28, color: '#f0c040', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#aaa', marginBottom: 8, fontSize: 14 },
  counter: { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 24 },
  uploadBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #444', borderRadius: 12, padding: 20, cursor: 'pointer', marginBottom: 12, minHeight: 180, overflow: 'hidden' },
  uploadPlaceholder: { textAlign: 'center', color: '#666' },
  previewImg: { maxWidth: '100%', maxHeight: 250, borderRadius: 8 },
  reuploadBtn: { display: 'block', textAlign: 'center', color: '#4a9eff', cursor: 'pointer', marginBottom: 16, fontSize: 14 },
  btn: { width: '100%', padding: '14px 0', background: '#f0c040', color: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16 },
  error: { color: '#ff6b6b', textAlign: 'center' },
  resultBox: { marginTop: 24 },
  resultLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  watermarkWrapper: { position: 'relative', display: 'inline-block', width: '100%' },
  resultImg: { width: '100%', borderRadius: 8, display: 'block' },
  watermark: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontSize: 36, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap' },
  sizeNote: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 8 },
  buyBtn: { display: 'block', marginTop: 12, padding: '14px 0', background: '#e63946', color: '#fff', borderRadius: 8, textAlign: 'center', textDecoration: 'none', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#16213e', borderRadius: 16, padding: 24, width: '90%', maxWidth: 700, color: '#eee' },
  modalTitle: { textAlign: 'center', marginBottom: 16, color: '#f0c040', fontSize: 20 },
  cropContainer: { position: 'relative', width: '100%', height: 380, background: '#000', borderRadius: 8, overflow: 'hidden' },
  sliderWrapper: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 16 },
  sliderLabel: { fontSize: 14, color: '#aaa', whiteSpace: 'nowrap' },
  slider: { flex: 1, accentColor: '#f0c040' },
  modalButtons: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 24px', background: 'transparent', border: '1px solid #555', color: '#aaa', borderRadius: 8, cursor: 'pointer', fontSize: 16 },
  saveBtn: { padding: '10px 24px', background: '#f0c040', color: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 'bold' },
};

const overlay = {
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bgImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px) brightness(0.4)', transform: 'scale(1.1)' },
  box: { position: 'relative', zIndex: 1, background: 'rgba(22,33,62,0.85)', borderRadius: 20, padding: '40px 48px', maxWidth: 480, width: '90%', textAlign: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' },
  topLabel: { fontSize: 11, letterSpacing: 3, color: '#888', textTransform: 'uppercase', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 24, fontFamily: 'Georgia, serif' },
  barTrack: { background: '#333', borderRadius: 99, height: 6, marginBottom: 28, overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #f0c040, #e63946)', borderRadius: 99, transition: 'width 0.2s ease' },
  steps: { textAlign: 'left', marginBottom: 28 },
  stepRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepIcon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
  stepText: { fontSize: 15 },
  upsell: { borderTop: '1px solid #333', paddingTop: 20 },
  upsellText: { fontSize: 13, color: '#aaa', lineHeight: 1.6 },
};
