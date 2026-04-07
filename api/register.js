const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST — inscription d'un joueur
  if (req.method === 'POST') {
    const { pseudo, riotId, phone, email } = req.body || {};

    // Validation des champs
    if (!pseudo || !riotId || !phone || !email) {
      return res.status(400).json({ error: 'Tous les champs sont requis (pseudo, riotId, phone, email)' });
    }
    if (!riotId.includes('#')) {
      return res.status(400).json({ error: 'Le Riot ID doit contenir un # (ex: Pseudo#EUW)' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    if (phone.trim().length === 0) {
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    try {
      // Vérifier les doublons (email ou riotId)
      const existing = await kv.lrange('registrations', 0, -1) || [];
      const duplicate = existing.some(entry => {
        try {
          const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
          return parsed.email === email || parsed.riotId === riotId;
        } catch {
          return false;
        }
      });

      if (duplicate) {
        return res.status(200).json({ message: 'Déjà inscrit', alreadyExists: true });
      }

      // Enregistrer le joueur
      const registration = {
        pseudo,
        riotId,
        phone,
        email,
        date: new Date().toISOString()
      };
      await kv.rpush('registrations', JSON.stringify(registration));

      return res.status(200).json({ message: 'Inscription réussie !', alreadyExists: false });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET — lister tous les inscrits (protégé)
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    try {
      const raw = await kv.lrange('registrations', 0, -1) || [];
      const registrations = raw.map(entry => {
        try { return typeof entry === 'string' ? JSON.parse(entry) : entry; } catch { return entry; }
      });
      return res.status(200).json({
        total: registrations.length,
        registrations
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
