import OpenAI from 'openai';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Kein Bild empfangen' });

    // Dùng gpt-image-1 generate với vision — gửi ảnh qua messages
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Describe this person in detail: face shape, hair, facial features, expression, age, clothing.',
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const description = response.choices[0].message.content;

    // Dùng mô tả để tạo ảnh bút chì
    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `A highly detailed pencil sketch portrait of: ${description}. Black and white, hand-drawn pencil drawing style, fine pencil strokes, hatching and cross-hatching shading, pure pencil on white paper. No color, no watercolor, only pencil.`,
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = imageResponse.data[0].url
      || `data:image/png;base64,${imageResponse.data[0].b64_json}`;

    res.status(200).json({ imageUrl });
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
