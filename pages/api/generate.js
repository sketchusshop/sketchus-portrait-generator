import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Upload fehlgeschlagen' });

    try {
      const file = files.image[0];
      const imageStream = fs.createReadStream(file.filepath);

      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageStream,
        prompt: `Convert this photo into a highly detailed pencil sketch portrait. 
Black and white, hand-drawn pencil drawing style, fine pencil strokes, 
hatching and cross-hatching shading, realistic facial features, 
pure pencil on white paper. No color.`,
        n: 1,
        size: '1024x1024',
      });

      const imageUrl = response.data[0].url;
      res.status(200).json({ imageUrl });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'OpenAI Fehler: ' + e.message });
    }
  });
}
