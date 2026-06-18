import { AI_PROMPT } from '../../config';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

async function imgbb(b64) {
  const f = new URLSearchParams();
  f.append('key', process.env.IMGBB_API_KEY);
  f.append('image', b64);
  f.append('expiration', '15552000');
  const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: f });
  const j = await r.json();
  if (!j.success) throw new Error('ImgBB: ' + JSON.stringify(j.error));
  return j.data.url;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'No image' });

  try {
    const buf = Buffer.from(imageBase64, 'base64');
    const b = 'boundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1\r\n`),
      Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${AI_PROMPT}\r\n`),
      Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1\r\n`),
      Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1536x1024\r\n`),
      Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`),
      buf,
      Buffer.from(`\r\n--${b}--\r\n`),
    ]);

    const aiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${b}`,
      },
      body,
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok) return res.status(500).json({ error: aiData.error?.message || 'OpenAI error' });

    let aiB64 = aiData.data[0].b64_json;
    if (!aiB64) {
      const r = await fetch(aiData.data[0].url);
      aiB64 = Buffer.from(await r.arrayBuffer()).toString('base64');
    }

    const storedUrl = await imgbb(aiB64);
    const previewUrl = aiData.data[0].url || `data:image/png;base64,${aiB64}`;

    return res.status(200).json({ previewUrl, storedUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
