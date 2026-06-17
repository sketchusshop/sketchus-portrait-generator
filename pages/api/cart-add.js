export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { variantId, portraitUrl } = req.body || {};
  if (!variantId || !portraitUrl) return res.status(400).json({ error: 'Missing params' });

  // Tạo checkout URL với note — không cần token, không bị CORS
  const note = encodeURIComponent(`Portrait-Link: ${portraitUrl} | Erstellt: ${new Date().toLocaleString('de-DE')}`);
  const checkoutUrl = `https://sketch-us.myshopify.com/cart/${variantId}:1?note=${note}&attributes[Portrait-Link]=${encodeURIComponent(portraitUrl)}`;

  return res.status(200).json({ ok: true, checkoutUrl });
}
