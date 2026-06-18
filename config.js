export const SHOP_CONFIG = {
  shopDomain: 'sketch-us.myshopify.com',
  variantId: '58043598831880',
  price: '29,99',
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

export const AI_PROMPT = `
This is a photo-to-pencil filter conversion, not a new portrait generation.

Do not redraw the face. Do not change identity. Preserve the original face, eyes, nose, mouth, expression, gaze, angle, proportions, hairstyle, and all facial details exactly.

Only transform the photo into a high-contrast black-and-white graphite pencil look. Add stronger dark shadows, bright paper highlights, visible pencil grain, and handmade sketch texture.

Simplify only the background and secondary areas. Replace the background with soft charcoal shading on textured white paper.

No new face, no beautifying, no added features, no text, no logo, no watermark.
`;

export const LANG = {
  de: {
    title: '',
    sub: 'Lade 1 Foto hoch und sieh deine Skizze vor der Bestellung.',
    counter: () => '',
    upload: 'Foto hochladen',
    uploadHint: 'JPG, PNG oder WEBP',
    change: 'Anderes Foto',
    cropTitle: 'Ausschnitt w\u00e4hlen',
    cropSave: '\u00dcbernehmen',
    cropCancel: 'Abbrechen',
    generate: 'Skizze ansehen',
    loadingSteps: [
      'Foto wird vorbereitet',
      'Skizze wird erstellt',
      'Details werden verfeinert',
      'Fast fertig',
    ],
    loadingNote: 'Nur 1 Foto m\u00f6glich. F\u00fcr mehrere Vorlagen oder ein handgezeichnetes Original bitte Sketchus Originalportrait w\u00e4hlen.',
    limitMsg: () => 'Limit erreicht.',
    errGeneric: 'Fehler. Bitte erneut versuchen.',
    history: (n) => `Fr\u00fchere Skizzen (${n})`,
    historyTitle: 'Deine Skizzen',
    historySelect: 'Ausw\u00e4hlen',
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
