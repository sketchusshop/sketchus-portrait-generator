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

function buildImageEditBody({ imageBuffer, model, prompt }) {
  const b = 'boundary' + Date.now();

  const body = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${prompt}\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1536x1024\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="quality"\r\n\r\nhigh\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="input_fidelity"\r\n\r\nhigh\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`),
    imageBuffer,
    Buffer.from(`\r\n--${b}--\r\n`),
  ]);

  return { body, boundary: b };
}

async function createImageEdit({ imageBuffer, model }) {
  const { body, boundary } = buildImageEditBody({
    imageBuffer,
    model,
    prompt: AI_PROMPT,
  });

  const aiRes = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const aiData = await aiRes.json();

  if (!aiRes.ok) {
    const msg = aiData.error?.message || 'OpenAI error';
    throw new Error(msg);
  }

  return aiData;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'No image' });

  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    let aiData;
    let usedModel = 'gpt-image-2';

    try {
      aiData = await createImageEdit({
        imageBuffer,
        model: 'gpt-image-2',
      });
    } catch (err) {
      console.warn('gpt-image-2 failed, fallback to gpt-image-1:', err.message);

      usedModel = 'gpt-image-1';
      aiData = await createImageEdit({
        imageBuffer,
        model: 'gpt-image-1',
      });
    }

    let aiB64 = aiData.data?.[0]?.b64_json;

    if (!aiB64 && aiData.data?.[0]?.url) {
      const r = await fetch(aiData.data[0].url);
      aiB64 = Buffer.from(await r.arrayBuffer()).toString('base64');
    }

    if (!aiB64) {
      throw new Error('No image returned from OpenAI');
    }

    const storedUrl = await imgbb(aiB64);
    const previewUrl = aiData.data?.[0]?.url || `data:image/png;base64,${aiB64}`;

    return res.status(200).json({
      previewUrl,
      storedUrl,
      model: usedModel,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
