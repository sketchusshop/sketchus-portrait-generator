import { AI_PROMPT, SHOP_CONFIG } from '../../config';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

async function uploadToImgBB(base64Data) {
  const form = new URLSearchParams();
  form.append('key', process.env.IMGBB_API_KEY);
  form.append('image', base64Data);
  form.append('expiration', '15552000'); // 180 ngày
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  const json = await res.json();
  if (!json.success) throw new Error('ImgBB failed: ' + JSON.stringify(json.error));
  return json.data.url;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64, originalBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'No image' });

  try {
    // Gọi OpenAI
    const imgBuffer = Buffer.from(imageBase64, 'base64');
    const boundary = 'boundary' + Date.now();
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1`,
      `--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${AI_PROMPT}`,
      `--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`,
      `--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1536x1024`,
    ];
    const imgHeader = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const bodyParts = Buffer.concat([
      Buffer.from(parts.join('\r\n') + '\r\n'),
      Buffer.from(imgHeader),
      imgBuffer,
      Buffer.from(footer),
    ]);

    const aiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyParts,
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) return res.status(500).json({ error: aiData.error?.message || 'OpenAI error' });

    // Lấy base64 ảnh AI
    let aiBase64;
    if (aiData.data[0].b64_json) {
      aiBase64 = aiData.data[0].b64_json;
    } else {
      const r = await fetch(aiData.data[0].url);
      aiBase64 = Buffer.from(await r.arrayBuffer()).toString('base64');
    }

    // Upload cả 2 lên ImgBB song song
    const [aiUrl, origUrl] = await Promise.all([
      uploadToImgBB(aiBase64),
      originalBase64 ? uploadToImgBB(originalBase64) : Promise.resolve(null),
    ]);

    return res.status(200).json({
      imageUrl: aiData.data[0].url || `data:image/png;base64,${aiBase64}`,
      aiStoredUrl: aiUrl,       // link tải ảnh AI — lưu vào đơn hàng
      origStoredUrl: origUrl,   // link ảnh gốc khách upload
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
