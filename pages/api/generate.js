import { AI_PROMPT } from '../../config';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

async function imgbb(b64) {
  const f = new URLSearchParams();
  f.append('key', process.env.IMGBB_API_KEY);
  f.append('image', b64);
  f.append('expiration', '15552000');

  const r = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: f,
  });

  const j = await r.json();

  if (!j.success) {
    throw new Error('ImgBB: ' + JSON.stringify(j.error));
  }

  return j.data.url;
}

function addFormField(parts, boundary, name, value) {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    )
  );
}

function buildImageEditBody({ imageBuffer, model, prompt }) {
  const boundary = 'boundary' + Date.now();
  const parts = [];

  addFormField(parts, boundary, 'model', model);
  addFormField(parts, boundary, 'prompt', prompt);
  addFormField(parts, boundary, 'n', '1');
  addFormField(parts, boundary, 'size', '1536x1024');

  // Giữ quality, nhưng bỏ input_fidelity vì gpt-image-2 không hỗ trợ
  addFormField(parts, boundary, 'quality', 'high');

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`
    )
  );

  parts.push(imageBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    boundary,
  };
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image' });
  }

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

    return res.status(200).json({
      previewUrl: storedUrl,
      storedUrl,
      model: usedModel,
    });
  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: e.message || 'Server error',
    });
  }
}
