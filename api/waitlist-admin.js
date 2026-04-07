const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // Protection par secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  // GET — lister tous les emails
  if (req.method === 'GET') {
    try {
      const raw = await kv.lrange('waitlist:emails', 0, -1) || [];
      const emails = raw.map(e => {
        try { return JSON.parse(e); } catch { return { email: e, date: null }; }
      });
      return res.status(200).json({
        total: emails.length,
        emails
      });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE — supprimer un email spécifique
  if (req.method === 'DELETE') {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requis' });

    try {
      const raw = await kv.lrange('waitlist:emails', 0, -1) || [];
      const toRemove = raw.find(e => {
        try { return JSON.parse(e).email === email; } catch { return false; }
      });
      if (toRemove) {
        await kv.lrem('waitlist:emails', 1, toRemove);
        return res.status(200).json({ message: `${email} supprimé` });
      }
      return res.status(404).json({ error: 'Email non trouvé' });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
