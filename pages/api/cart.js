export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { variantId, aiStoredUrl, origStoredUrl } = req.body;

  const properties = {
    'Portrait-Vorschau': aiStoredUrl,
    'Erstellt am': new Date().toLocaleString('de-DE'),
  };
  if (origStoredUrl) properties['Originalfoto'] = origStoredUrl;

  // Gọi Shopify từ server — không bị CORS
  const shopifyRes = await fetch(`https://sketch-us.myshopify.com/cart/add.js`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://sketch-us.myshopify.com',
    },
    body: JSON.stringify({
      id: Number(variantId),
      quantity: 1,
      properties,
    }),
  });

  const data = await shopifyRes.json();
  if (!shopifyRes.ok) {
    return res.status(400).json({ error: data.description || 'Cart error' });
  }

  res.status(200).json({ checkoutUrl: 'https://sketch-us.myshopify.com/checkout' });
}
