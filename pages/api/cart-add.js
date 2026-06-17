export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { variantId, portraitUrl } = req.body || {};
  if (!variantId || !portraitUrl) return res.status(400).json({ error: 'Missing params' });

  try {
    const r = await fetch('https://sketch-us.myshopify.com/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Number(variantId),
        quantity: 1,
        properties: {
          '🖼 Portrait-Link': portraitUrl,
          'Erstellt am': new Date().toLocaleString('de-DE'),
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(400).json({ error: data.description || 'Cart error' });
    return res.status(200).json({ ok: true, checkoutUrl: 'https://sketch-us.myshopify.com/checkout' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
