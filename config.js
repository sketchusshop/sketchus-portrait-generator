// ============================================================
// SKETCHUS PORTRAIT GENERATOR — CONFIG
// Chỉnh text, màu sắc, giá, link tại đây. Không cần sửa code.
// ============================================================

export const SHOP_CONFIG = {
  // Shopify
  shopDomain: 'sketch-us.myshopify.com',
  variantId: '58043598831880',
  price: '€9,99',

  // Links
  vercelUrl: 'https://sketchus-portrait-generator.vercel.app',
  originalPortraitUrl: 'https://sketchus.de/collections/original-portraits',

  // Giới hạn
  maxPreviewsPerDay: 10,

  // Tỉ lệ ảnh kết quả: A4 ngang = 297/210
  imageAspectRatio: 297 / 210,

  // Thời gian loading ước tính (ms)
  estimatedLoadingMs: 55000,
};

// ============================================================
// DESIGN — Chỉnh màu sắc, font, bo góc tại đây
// ============================================================
export const DESIGN = {
  colors: {
    pageBg: '#1a1a2e',          // Nền trang
    cardBg: '#16213e',          // Nền card
    accent: '#f0c040',          // Màu vàng chính (nút, tiêu đề)
    accentText: '#1a1a2e',      // Chữ trên nút vàng
    buyBtn: '#e63946',          // Nút mua (đỏ)
    buyBtnText: '#ffffff',      // Chữ nút mua
    text: '#eeeeee',            // Chữ chính
    textMuted: '#aaaaaa',       // Chữ phụ
    textDim: '#888888',         // Chữ mờ
    border: '#444444',          // Viền upload
    linkColor: '#4a9eff',       // Link màu xanh
    error: '#ff6b6b',           // Màu lỗi
    overlayBg: 'rgba(22,33,62,0.85)', // Nền loading overlay
  },
  font: 'Georgia, serif',
  borderRadius: {
    card: 16,
    btn: 8,
    upload: 12,
    modal: 16,
  },
};

// ============================================================
// TRANSLATIONS — Chỉnh text tiếng Đức và tiếng Anh tại đây
// ============================================================
export const TRANSLATIONS = {
  de: {
    title: '✏️ Bleistift-Portrait Generator',
    subtitle: 'Lade dein Foto hoch und erhalte ein künstlerisches Bleistift-Portrait',
    counter: (count, max) => `${count} von ${max} Vorschauen heute verwendet`,
    upload: 'Foto hochladen (JPG, PNG, WEBP)',
    uploadHint: 'Klicken oder Bild hierher ziehen',
    changePhoto: '🔄 Anderes Foto wählen',
    generate: '✏️ Portrait erstellen',
    generating: '⏳ Wird erstellt...',
    cropTitle: 'Bild zuschneiden',
    cropSave: 'Speichern',
    cropCancel: 'Abbrechen',
    zoom: '🔍 Zoom',
    resultLabel: 'Vorschau (A4 Querformat) mit Wasserzeichen:',
    sizeNote: '📐 Format: A4 Querformat (297 × 210 mm)',
    buyBtn: (price) => `🛒 Jetzt kaufen & wir drucken es für dich — ${price}`,
    upsellText: 'Möchtest du ein echtes handgezeichnetes Original?',
    upsellLink: 'Sketchus Original →',
    loadingHeadline: 'WIR ERSTELLEN DEIN KUNSTWERK',
    loadingSteps: [
      'Details werden analysiert',
      'Skizze wird erstellt',
      'Komposition wird optimiert',
      'Finalisierung',
    ],
    loadingUpsell: (brand) => `Dieser Entwurf wird automatisch aus 1 Foto erstellt. Mehrere Vorlagen? Dann lass echte Künstler dein ${brand} Original von Hand zeichnen.`,
    limitReached: (max) => `Du hast das Tageslimit von ${max} Vorschauen erreicht.`,
    errorGeneric: 'Fehler beim Erstellen. Bitte versuche es erneut.',
  },
  en: {
    title: '✏️ Pencil Portrait Generator',
    subtitle: 'Upload your photo and receive an artistic pencil portrait',
    counter: (count, max) => `${count} of ${max} previews used today`,
    upload: 'Upload photo (JPG, PNG, WEBP)',
    uploadHint: 'Click or drag image here',
    changePhoto: '🔄 Choose a different photo',
    generate: '✏️ Create portrait',
    generating: '⏳ Creating...',
    cropTitle: 'Crop image',
    cropSave: 'Save',
    cropCancel: 'Cancel',
    zoom: '🔍 Zoom',
    resultLabel: 'Preview (A4 landscape) with watermark:',
    sizeNote: '📐 Format: A4 landscape (297 × 210 mm)',
    buyBtn: (price) => `🛒 Buy now & we print it for you — ${price}`,
    upsellText: 'Want a real hand-drawn original?',
    upsellLink: 'Sketchus Original →',
    loadingHeadline: 'WE ARE CREATING YOUR ARTWORK',
    loadingSteps: [
      'Analysing details',
      'Creating sketch',
      'Optimising composition',
      'Finalising',
    ],
    loadingUpsell: (brand) => `This draft is automatically created from 1 photo. Multiple references? Let real artists draw your ${brand} Original by hand.`,
    limitReached: (max) => `You have reached the daily limit of ${max} previews.`,
    errorGeneric: 'Error creating portrait. Please try again.',
  },
};

// ============================================================
// AI PROMPT — Chỉnh style ảnh tại đây
// ============================================================
export const AI_PROMPT = `Convert this photo into a highly detailed pencil sketch portrait. 
Black and white, hand-drawn pencil drawing style, fine pencil strokes, 
hatching and cross-hatching shading, realistic facial features, 
pure pencil on white paper. No color.`;
