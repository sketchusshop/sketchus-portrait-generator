import { AI_PROMPT, SHOP_CONFIG } from '../../config';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

async function uploadToImgBB(base64Data) {
  const formData = new URLSearchParams();
  formData.append('key', process.env.IMGBB_API_KEY);
  formData.append('image', base64Data);
  formData.append('expiration', '2592000'); // 30 Tage

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error('ImgBB upload failed');
  return data.data.url;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { imageBase64, originalBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Kein Bild empfangen' });

    const buffer = Buffer.from(imageBase64, 'base64');
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`);
    const modelPart = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1`);
    const promptPart = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${AI_PROMPT}`);
    const nPart = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`);
    const sizePart = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1536x1024`);
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, buffer, modelPart, promptPart, nPart, sizePart, footer]);

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'OpenAI Fehler' });

    const imageUrl = data.data[0].url || `data:image/png;base64,${data.data[0].b64_json}`;

    // Lấy base64 từ OpenAI response hoặc fetch từ URL
    let aiBase64;
    if (data.data[0].b64_json) {
      aiBase64 = data.data[0].b64_json;
    } else {
      const aiRes = await fetch(imageUrl);
      const aiBuffer = Buffer.from(await aiRes.arrayBuffer());
      aiBase64 = aiBuffer.toString('base64');
    }

    // Upload lên ImgBB
    const [aiStoredUrl, originalStoredUrl] = await Promise.all([
      uploadToImgBB(aiBase64),
      originalBase64 ? uploadToImgBB(originalBase64) : Promise.resolve(null),
    ]);

    // Checkout URL — gắn vào LINE ITEM PROPERTIES
    const params = new URLSearchParams();
    params.append('properties[🖼 Portrait-Datei]', aiStoredUrl);
    if (originalStoredUrl) params.append('properties[📷 Originalfoto]', originalStoredUrl);
    params.append('properties[Erstellt am]', new Date().toLocaleString('de-DE'));

    const checkoutUrl = `https://${SHOP_CONFIG.shopDomain}/cart/${SHOP_CONFIG.variantId}:1?${params.toString()}`;

    res.status(200).json({ imageUrl, checkoutUrl });
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
