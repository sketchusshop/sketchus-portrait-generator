import OpenAI, { toFile } from 'openai';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Kein Bild empfangen' });

    const buffer = Buffer.from(imageBase64, 'base64');
    console.log('Buffer size:', buffer.length);

    const imageFile = await toFile(buffer, 'photo.png', { type: 'image/png' });
    console.log('File name:', imageFile.name);
    console.log('File type:', imageFile.type);
    console.log('File size:', imageFile.size);

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: `Convert this photo into a pencil sketch portrait. Black and white, hand-drawn style.`,
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = response.data[0].url
      || `data:image/png;base64,${response.data[0].b64_json}`;

    res.status(200).json({ imageUrl });
  } catch (e) {
    // Trả về full error để debug
    res.status(500).json({
      error: e.message,
      status: e.status,
      code: e.code,
      type: e.type,
      details: e.error || null,
    });
  }
}
