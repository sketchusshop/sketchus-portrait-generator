import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

function getCroppedImg(imageSrc, croppedAreaPixels) {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width, croppedAreaPixels.height
      );
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
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

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

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
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler');
      setResult(data.imageUrl);
      setCount(c => c + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>✏️ Bleistift-Portrait Generator</h1>
        <p style={styles.subtitle}>Lade dein Foto hoch und erhalte ein künstlerisches Bleistift-Portrait</p>
        <p style={styles.counter}>{count} von {MAX} Vorschauen heute verwendet</p>

        {/* Upload Area */}
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
            <p style={styles.resultLabel}>Vorschau mit Wasserzeichen:</p>
            <div style={styles.watermarkWrapper}>
              <img src={result} alt="Portrait" style={styles.resultImg} />
              <div style={styles.watermark}>© Sketchus</div>
            </div>
            <a href="https://sketchus.de/products/bleistift-portrait" style={styles.buyBtn}>
              🛒 Vollbild kaufen für €9,99
            </a>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {showCropModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h2 style={styles.modalTitle}>Bild zuschneiden</h2>

            <div style={styles.cropContainer}>
              <Cropper
                image={rawPreview}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom Slider */}
            <div style={styles.sliderWrapper}>
              <span style={styles.sliderLabel}>🔍 Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={styles.slider}
              />
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
  card: { background: '#16213e', borderRadius: 16, padding: 40, maxWidth: 600, width: '100%', color: '#eee', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  title: { textAlign: 'center', fontSize: 28, color: '#f0c040', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#aaa', marginBottom: 8, fontSize: 14 },
  counter: { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 24 },
  uploadBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #444', borderRadius: 12, padding: 20, cursor: 'pointer', marginBottom: 12, minHeight: 200, overflow: 'hidden' },
  uploadPlaceholder: { textAlign: 'center', color: '#666' },
  previewImg: { maxWidth: '100%', maxHeight: 300, borderRadius: 8 },
  reuploadBtn: { display: 'block', textAlign: 'center', color: '#4a9eff', cursor: 'pointer', marginBottom: 16, fontSize: 14 },
  btn: { width: '100%', padding: '14px 0', background: '#f0c040', color: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16 },
  error: { color: '#ff6b6b', textAlign: 'center' },
  resultBox: { marginTop: 24 },
  resultLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  watermarkWrapper: { position: 'relative', display: 'inline-block', width: '100%' },
  resultImg: { width: '100%', borderRadius: 8 },
  watermark: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontSize: 36, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap' },
  buyBtn: { display: 'block', marginTop: 16, padding: '14px 0', background: '#e63946', color: '#fff', borderRadius: 8, textAlign: 'center', textDecoration: 'none', fontSize: 18, fontWeight: 'bold' },
  // Modal
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
