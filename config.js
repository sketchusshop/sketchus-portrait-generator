export const SHOP_CONFIG = {
  shopDomain: 'sketch-us.myshopify.com',
  variantId: '58043598831880',
  price: '9,99',
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

export const AI_PROMPT = `Turn the uploaded photo into a handmade graphite and charcoal drawing on textured white paper.

Preserve the main subject exactly. Keep the same face identity, face shape, angle, gaze, expression, age, hairstyle, fur, pose, perspective, proportions, and all important recognizable features. Do not change, beautify, rotate, add, remove, or invent important parts.

Draw the most important areas with more detail and care: faces, eyes, nose, mouth, hair, fur, hands, glasses, jewelry, vehicle front, wheels, lights, house windows, roof lines, and other key identity details.

Use realistic pencil linework and charcoal shading with visible hand strokes, natural paper grain, strong light-dark contrast, dark blacks, and bright paper highlights. The drawing should feel handmade and artistic, not smooth or photo-like.

Simplify only the background, environment, clothing folds, and small secondary details with loose sketch lines, soft charcoal dust, and unfinished fade-out edges.

Remove the original background and replace it with an airy, subtle charcoal-paper background.

Style: traditional graphite and charcoal portrait/sketch, detailed main subject, loose background, expressive hand shading. Not cartoon, not anime, not digital filter, not photorealistic.

No text, logo, watermark, or signature.`;

export const LANG = {
  de: {
    title: '',
    sub: 'Lade 1 Foto hoch und sieh deine Skizze vor der Bestellung.',
    counter: () => '',
    upload: 'Foto hochladen',
    uploadHint: 'JPG, PNG oder WEBP',
    change: 'Anderes Foto',
    cropTitle: 'Ausschnitt waehlen',
    cropSave: 'Uebernehmen',
    cropCancel: 'Abbrechen',
    generate: 'Skizze ansehen',
    loadingSteps: [
      'Foto wird vorbereitet',
      'Skizze wird erstellt',
      'Details werden verfeinert',
      'Fast fertig',
    ],
    loadingNote: 'Nur 1 Foto moeglich. Fuer mehrere Vorlagen oder ein handgezeichnetes Original bitte Sketchus Originalportrait waehlen.',
    limitMsg: () => 'Limit erreicht.',
    errGeneric: 'Fehler. Bitte erneut versuchen.',
    history: (n) => `Fruehere Skizzen (${n})`,
    historyTitle: 'Deine Skizzen',
    historySelect: 'Auswaehlen',
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
    loadingSteps: [
      'Preparing photo',
      'Creating sketch',
      'Refining details',
      'Almost done',
    ],
    loadingNote: 'Only 1 photo possible. For multiple versions or a hand-drawn original, please choose Sketchus Original Portrait.',
    limitMsg: () => 'Limit reached.',
    errGeneric: 'Error. Please try again.',
    history: (n) => `Previous sketches (${n})`,
    historyTitle: 'Your sketches',
    historySelect: 'Select',
  },
};
