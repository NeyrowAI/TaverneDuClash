const { kv } = require('@vercel/kv');
const { sendConfirmEmail } = require('./send-waitlist-confirm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — retourne le nombre d'inscrits
  if (req.method === 'GET') {
    try {
      const emails = await kv.lrange('waitlist:emails', 0, -1);
      return res.status(200).json({ count: emails ? emails.length : 0 });
    } catch(e) {
      return res.status(200).json({ count: 0 });
    }
  }

  // POST — ajouter un email
  if (req.method === 'POST') {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    try {
      // Vérifier si déjà inscrit
      const emails = await kv.lrange('waitlist:emails', 0, -1) || [];
      const exists = emails.some(e => {
        try { return JSON.parse(e).email === email; } catch { return false; }
      });

      if (exists) {
        return res.status(200).json({ message: 'Déjà inscrit', alreadyExists: true });
      }

      // Ajouter
      await kv.rpush('waitlist:emails', JSON.stringify({
        email,
        date: new Date().toISOString()
      }));

      const newCount = emails.length + 1;

      // Send confirmation email (non-blocking)
      sendConfirmEmail(email).catch(() => {});

      return res.status(200).json({ message: 'Inscrit !', count: newCount });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
