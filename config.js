export const SHOP_CONFIG = {
  shopDomain: 'sketch-us.myshopify.com',
  variantId: '58043598831880',
  price: '€9,99',
  vercelUrl: 'https://sketchus-portrait-generator.vercel.app',
  originalPortraitUrl: 'https://sketchus.de/collections/original-portraits',
  maxPreviewsPerDay: 10,
  imageAspectRatio: 297 / 210,
  estimatedLoadingMs: 55000,
};

export const DESIGN = {
  colors: {
    pageBg: '#4a4a4a',           // Nền xám như Shopify theme
    cardBg: '#4a4a4a',           // Không có card — tràn viền
    accent: '#ffffff',            // Nút màu trắng
    accentText: '#1a1a1a',       // Chữ đen trên nút trắng
    buyBtn: '#ffffff',
    buyBtnText: '#1a1a1a',
    text: '#ffffff',              // Toàn bộ chữ trắng
    textMuted: '#dddddd',
    textDim: '#bbbbbb',
    border: 'rgba(255,255,255,0.3)',
    linkColor: '#ffffff',
    error: '#ff6b6b',
    overlayBg: 'rgba(74,74,74,0.97)',
  },
  font: '"Helvetica Neue", Arial, sans-serif',
  borderRadius: {
    card: 0,
    btn: 4,
    upload: 4,
    modal: 8,
  },
};

export const TRANSLATIONS = {
  de: {
    title: 'KI Bleistift-Portrait',
    subtitle: 'Lade dein Foto hoch — wir erstellen dein persönliches Bleistift-Portrait',
    counter: (count, max) => `${count} von ${max} kostenlosen Vorschauen`,
    upload: 'Foto hochladen',
    uploadHint: 'JPG, PNG oder WEBP · Klicken oder hierher ziehen',
    changePhoto: 'Anderes Foto wählen',
    generate: 'Portrait erstellen',
    generating: 'Wird erstellt…',
    cropTitle: 'Bildausschnitt wählen',
    cropSave: 'Übernehmen',
    cropCancel: 'Abbrechen',
    zoom: 'Zoom',
    resultLabel: 'Vorschau mit Wasserzeichen:',
    sizeNote: 'Format: A4 Querformat · 300 DPI druckfertig',
    buyBtn: (price) => `Jetzt bestellen — ${price}`,
    upsellText: 'Lieber ein echtes handgezeichnetes Original?',
    upsellLink: 'Sketchus Original ansehen →',
    loadingHeadline: 'DEIN PORTRAIT WIRD ERSTELLT',
    loadingSteps: [
      'Foto wird analysiert',
      'Bleistiftskizze wird erstellt',
      'Details werden verfeinert',
      'Finalisierung',
    ],
    loadingUpsell: (brand) => `Dieser Entwurf wird automatisch aus 1 Foto erstellt. Für ein echtes handgezeichnetes ${brand} Original — von echten Künstlern.`,
    limitReached: (max) => `Du hast ${max} kostenlose Vorschauen verwendet.`,
    errorGeneric: 'Fehler beim Erstellen. Bitte erneut versuchen.',
  },
  en: {
    title: 'AI Pencil Portrait',
    subtitle: 'Upload your photo — we create your personal pencil portrait',
    counter: (count, max) => `${count} of ${max} free previews used`,
    upload: 'Upload photo',
    uploadHint: 'JPG, PNG or WEBP · Click or drag here',
    changePhoto: 'Choose different photo',
    generate: 'Create portrait',
    generating: 'Creating…',
    cropTitle: 'Choose crop',
    cropSave: 'Apply',
    cropCancel: 'Cancel',
    zoom: 'Zoom',
    resultLabel: 'Preview with watermark:',
    sizeNote: 'Format: A4 landscape · 300 DPI print-ready',
    buyBtn: (price) => `Order now — ${price}`,
    upsellText: 'Prefer a real hand-drawn original?',
    upsellLink: 'View Sketchus Original →',
    loadingHeadline: 'CREATING YOUR PORTRAIT',
    loadingSteps: [
      'Analysing photo',
      'Creating pencil sketch',
      'Refining details',
      'Finalising',
    ],
    loadingUpsell: (brand) => `This preview is automatically generated from 1 photo. For a real hand-drawn ${brand} Original — by real artists.`,
    limitReached: (max) => `You have used ${max} free previews.`,
    errorGeneric: 'Error creating portrait. Please try again.',
  },
};

export const AI_PROMPT = `Convert this photo into a highly detailed pencil sketch portrait. 
Black and white, hand-drawn pencil drawing style, fine pencil strokes, 
hatching and cross-hatching shading, realistic facial features, 
pure pencil on white paper. No color.`;
