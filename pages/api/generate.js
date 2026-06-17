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

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: `Transform this photo into a detailed pencil sketch portrait. Black and white, hand-drawn pencil drawing style, fine artistic lines, realistic shading, high detail. The subject is: ${file.originalFilename}`,
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
