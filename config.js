export const SHOP_CONFIG = {
  shopDomain: 'sketch-us.myshopify.com',
  variantId: '58043598831880',
  price: '€9,99',
  originalPortraitUrl: 'https://sketchus.de/products/portrait-zeichnen-lassen',
  maxPreviews: 10,
  estimatedMs: 55000,
};

export const DESIGN = {
  bg: '#636363',
  font: '"Helvetica Neue", Arial, sans-serif',
  text: '#ffffff',
  textMuted: '#eeeeee',
  textDim: '#cccccc',
  border: 'rgba(255,255,255,0.3)',
  error: '#ff6b6b',
  btn: 4,
};

export const AI_PROMPT = `Convert this photo into a highly detailed pencil sketch portrait. Black and white, hand-drawn pencil drawing style, fine pencil strokes, hatching and cross-hatching shading, realistic facial features, pure pencil on white paper. No color.`;

export const LANG = {
  de: {
    title: '',
    sub: 'Lade 1 Foto hoch und sieh deine Skizze vor der Bestellung.',
    counter: () => '',
    upload: 'Foto hochladen',
    uploadHint: 'JPG, PNG oder WEBP',
    change: 'Anderes Foto',
    cropTitle: 'Ausschnitt wählen',
    cropSave: 'Übernehmen',
    cropCancel: 'Abbrechen',
    generate: 'Skizze ansehen',
    loadingSteps: ['Foto wird vorbereitet', 'Skizze wird erstellt', 'Details werden verfeinert', 'Fast fertig'],
    loadingNote: 'Nur 1 Foto möglich. Für mehrere Vorlagen oder ein handgezeichnetes Original bitte Sketchus Originalportrait wählen.',
    limitMsg: () => 'Limit erreicht.',
    errGeneric: 'Fehler. Bitte erneut versuchen.',
    history: (n) => `🕐 Frühere Skizzen (${n})`,
    historyTitle: 'Deine Skizzen',
    historySelect: 'Auswählen',
  },
  en: {
    title: '',
    sub: 'Upload 1 photo and see your sketch before ordering.',
    counter: () => '',
    upload: 'Upload photo',
    uploadHint: 'JPG, PNG or WEBP',
    change: 'Change photo',
    cropTitle: 'Choose crop',
    cropSave: 'Apply',
    cropCancel: 'Cancel',
    generate: 'See sketch',
    loadingSteps: ['Preparing photo', 'Creating sketch', 'Refining details', 'Almost done'],
    loadingNote: 'Only 1 photo possible. For multiple versions or a hand-drawn original, please choose Sketchus Original Portrait.',
    limitMsg: () => 'Limit reached.',
    errGeneric: 'Error. Please try again.',
    history: (n) => `🕐 Previous sketches (${n})`,
    historyTitle: 'Your sketches',
    historySelect: 'Select',
  },
};
