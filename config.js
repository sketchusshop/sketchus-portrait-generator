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

export const AI_PROMPT = `Create a handmade graphite and charcoal portrait from the uploaded photo. Preserve the exact face identity, face shape, head angle, gaze, expression, age, hairstyle, and distinctive features. Do not change or beautify any face. Make the portrait look clearly hand-drawn, not photo-like: visible pencil strokes, rough charcoal texture, grainy shading, strong dark blacks, bright paper highlights, bold contrast, expressive hand shading. Focus detail on the face, eyes, nose, mouth, and important identity features. Simplify clothing, hair masses, background, and small details with loose sketch lines and soft unfinished edges. Remove the original background. Add a light paper background with rough charcoal shadows and airy empty space. Style: traditional charcoal and graphite drawing on textured white paper, dramatic light and shadow, natural hand pressure, sketchy edges, not smooth, not polished, not digital filter, not photorealistic. No text, logo, watermark, or signature.;

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
    history: (n) => ` Frühere Skizzen (${n})`,
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
    history: (n) => ` Previous sketches (${n})`,
    historyTitle: 'Your sketches',
    historySelect: 'Select',
  },
};
