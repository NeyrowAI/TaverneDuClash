import { kv } from '@vercel/kv';

const KV_KEY = 'donations';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const donations = (await kv.get(KV_KEY)) || [];
      return res.status(200).json(donations);
    } catch (err) {
      console.error('KV read error:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la lecture des donations.' });
    }
  }

  if (req.method === 'POST') {
    // Protect POST: require ADMIN_SECRET header or internal call
    const adminSecret = req.headers['x-admin-secret'];
    const internalSecret = req.headers['x-internal-secret'];

    if (adminSecret !== process.env.ADMIN_SECRET && internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Non autorisé.' });
    }

    const { name, amount } = req.body;

    if (!name || !amount) {
      return res.status(400).json({ error: 'name et amount sont requis.' });
    }

    try {
      const donations = (await kv.get(KV_KEY)) || [];
      const newDonation = {
        name: name.trim(),
        amount: Number(amount),
        date: new Date().toISOString(),
      };
      donations.unshift(newDonation);
      await kv.set(KV_KEY, donations);
      return res.status(200).json({ success: true, donation: newDonation });
    } catch (err) {
      console.error('KV write error:', err.message);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
