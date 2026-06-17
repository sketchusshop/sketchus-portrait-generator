import OpenAI from 'openai';
import { put } from '@vercel/blob';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VARIANT_ID = '58043598831880';
const SHOP_DOMAIN = 'sketch-us.myshopify.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { imageBase64, originalBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Kein Bild empfangen' });

    const buffer = Buffer.from(imageBase64, 'base64');
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`);
    const modelPart = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1`);
    const promptPart = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\nConvert this photo into a highly detailed pencil sketch portrait. Black and white, hand-drawn pencil drawing style, fine pencil strokes, hatching and cross-hatching shading, realistic facial features, pure pencil on white paper. No color.`);
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

    // Lưu ảnh AI lên Vercel Blob (link vĩnh viễn)
    const aiImageRes = await fetch(imageUrl);
    const aiImageBuffer = Buffer.from(await aiImageRes.arrayBuffer());
    const timestamp = Date.now();

    const aiBlob = await put(`portraits/ai_${timestamp}.png`, aiImageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    // Lưu ảnh gốc của khách lên Vercel Blob
    let originalBlobUrl = null;
    if (originalBase64) {
      const origBuffer = Buffer.from(originalBase64, 'base64');
      const origBlob = await put(`portraits/original_${timestamp}.jpg`, origBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });
      originalBlobUrl = origBlob.url;
    }

    // Checkout URL — ảnh gắn vào LINE ITEM PROPERTIES
    // Hiện trong đơn hàng Shopify dưới tên sản phẩm, có thể click tải
    const params = new URLSearchParams();
    params.append('properties[🖼 Bleistift-Portrait]', aiBlob.url);
    if (originalBlobUrl) {
      params.append('properties[📷 Originalfoto]', originalBlobUrl);
    }
    params.append('properties[Erstellt am]', new Date().toLocaleString('de-DE'));

    const checkoutUrl = `https://${SHOP_DOMAIN}/cart/${VARIANT_ID}:1?${params.toString()}`;

    res.status(200).json({
      imageUrl,
      checkoutUrl,
    });
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
