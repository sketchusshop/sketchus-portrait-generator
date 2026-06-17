import { useState } from 'react';

export default function Home() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const MAX = 10;

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }

  async function handleGenerate() {
    if (!image) return;
    if (count >= MAX) {
      setError('Du hast das Tageslimit von 10 Vorschauen erreicht.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', image);
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen');
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

        <label style={styles.uploadBox}>
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          {preview
            ? <img src={preview} alt="Upload" style={styles.previewImg} />
            : <div style={styles.uploadPlaceholder}>
                <span style={{ fontSize: 48 }}>📷</span>
                <p>Foto hochladen (klicken oder ziehen)</p>
              </div>
          }
        </label>

        <button
          onClick={handleGenerate}
          disabled={!image || loading || count >= MAX}
          style={{ ...styles.btn, opacity: (!image || loading || count >= MAX) ? 0.5 : 1 }}
        >
          {loading ? '⏳ Wird erstellt...' : '✏️ Portrait erstellen'}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        {result && (
          <div style={styles.resultBox}>
            <p style={styles.resultLabel}>Dein Bleistift-Portrait (Vorschau mit Wasserzeichen):</p>
            <div style={styles.watermarkWrapper}>
              <img src={result} alt="Portrait" style={styles.resultImg} />
              <div style={styles.watermark}>© Sketchus</div>
            </div>
            <a
              href="https://sketchus.de/products/bleistift-portrait"
              style={styles.buyBtn}
            >
              🛒 Vollbild kaufen für €9,99
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Georgia, serif' },
  card: { background: '#16213e', borderRadius: 16, padding: 40, maxWidth: 600, width: '100%', color: '#eee', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  title: { textAlign: 'center', fontSize: 28, color: '#f0c040', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#aaa', marginBottom: 8, fontSize: 14 },
  counter: { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 24 },
  uploadBox: { display: 'block', border: '2px dashed #444', borderRadius: 12, padding: 20, cursor: 'pointer', marginBottom: 20, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  uploadPlaceholder: { textAlign: 'center', color: '#666' },
  previewImg: { maxWidth: '100%', maxHeight: 300, borderRadius: 8 },
  btn: { width: '100%', padding: '14px 0', background: '#f0c040', color: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16 },
  error: { color: '#ff6b6b', textAlign: 'center' },
  resultBox: { marginTop: 24 },
  resultLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  watermarkWrapper: { position: 'relative', display: 'inline-block', width: '100%' },
  resultImg: { width: '100%', borderRadius: 8, filter: 'brightness(0.85)' },
  watermark: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontSize: 36, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap' },
  buyBtn: { display: 'block', marginTop: 16, padding: '14px 0', background: '#e63946', color: '#fff', borderRadius: 8, textAlign: 'center', textDecoration: 'none', fontSize: 18, fontWeight: 'bold' },
};
