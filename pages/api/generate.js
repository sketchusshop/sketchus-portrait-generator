import OpenAI from 'openai';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Kein Bild empfangen' });
    }

    // Resize ảnh về max 1024px trước khi gửi
    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const imageFile = new File([buffer], `photo.${ext}`, { type: 'image/jpeg' });

    console.log('File size:', buffer.length, 'bytes');
    console.log('MIME type:', mimeType);

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: `Convert this photo into a highly detailed pencil sketch portrait. Black and white, hand-drawn pencil drawing style, fine pencil strokes, hatching and cross-hatching shading, realistic facial features, pure pencil on white paper. No color.`,
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = response.data[0].url
      || `data:image/png;base64,${response.data[0].b64_json}`;

    res.status(200).json({ imageUrl });
  } catch (e) {
    console.error('Full error:', JSON.stringify(e, null, 2));
    res.status(500).json({ error: 'OpenAI Fehler: ' + (e.message || JSON.stringify(e)) });
  }
}
