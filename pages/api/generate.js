import OpenAI from 'openai';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Kein Bild empfangen' });

    const buffer = Buffer.from(imageBase64, 'base64');

    // Tạo FormData thủ công với boundary
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    
    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="photo.png"\r\n` +
      `Content-Type: image/png\r\n\r\n`
    );
    
    const modelPart = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n` +
      `gpt-image-1`
    );

    const promptPart = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="prompt"\r\n\r\n` +
      `Convert this photo into a highly detailed pencil sketch portrait. Black and white, hand-drawn pencil drawing style, fine pencil strokes, hatching and cross-hatching shading, realistic facial features, pure pencil on white paper. No color.`
    );

    const nPart = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="n"\r\n\r\n` +
      `1`
    );

    const sizePart = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="size"\r\n\r\n` +
      `1024x1024`
    );

    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

    const body = Buffer.concat([header, buffer, modelPart, promptPart, nPart, sizePart, footer]);

    // Gọi thẳng OpenAI REST API — bypass SDK hoàn toàn
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || 'OpenAI Fehler' });
    }

    const imageUrl = data.data[0].url
      || `data:image/png;base64,${data.data[0].b64_json}`;

    res.status(200).json({ imageUrl });
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
