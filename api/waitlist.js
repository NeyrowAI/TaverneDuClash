const { kv } = require('@vercel/kv');
const { Resend } = require('resend');

function buildConfirmHtml(siteUrl) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#160c28;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#160c28;">
    <tr><td align="center" style="padding:50px 20px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="border-radius:12px;border:1px solid rgba(168,85,247,0.25);overflow:hidden;">
        <tr><td align="center" style="background-color:#1a0e30;padding:45px 40px 25px;">
          <img src="${siteUrl}/logox.png" alt="TaverneDuClash" width="120" style="display:block;max-width:120px;height:auto;" />
        </td></tr>
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;">Confirmation</p>
        </td></tr>
        <tr><td align="center" style="background-color:#1a0e30;padding:8px 40px 12px;">
          <h1 style="margin:0;font-size:26px;color:#e8dff8;font-weight:600;">Bienvenue dans la Taverne</h1>
        </td></tr>
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 25px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="width:30px;height:2px;background-color:#a855f7;"></td>
              <td style="width:6px;"></td>
              <td style="width:30px;height:2px;background-color:#c9a84c;"></td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#1a0e30;padding:0 50px 35px;">
          <p style="margin:0;color:#9d8fc0;font-size:16px;line-height:1.9;text-align:center;font-style:italic;">
            Tu es maintenant inscrit sur la waitlist de TaverneDuClash. Tu seras pr&eacute;venu d&egrave;s que l&rsquo;outil de draft sera disponible.
          </p>
        </td></tr>
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#3d1a6e;border:1px solid rgba(168,85,247,0.5);border-radius:4px;padding:16px 48px;text-align:center;">
              <a href="${siteUrl}" style="color:#f0d080;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;display:block;">
                Voir le site
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 40px;">
          <p style="margin:0;font-size:12px;color:#6b5f7d;font-style:italic;">
            Stats en direct &middot; Coach IA &middot; Scout ennemi &middot; Rappels WhatsApp
          </p>
        </td></tr>
        <tr><td align="center" style="background-color:#0e0818;padding:22px 40px;border-top:1px solid rgba(201,168,76,0.12);">
          <p style="margin:0;font-size:12px;color:#6b5f7d;line-height:1.6;">
            TaverneDuClash &mdash; Construit avec l&rsquo;API Riot Games
          </p>
          <p style="margin:6px 0 0;font-size:10px;color:#4a3f5e;">
            Tu re&ccedil;ois cet email car tu t&rsquo;es inscrit sur la waitlist.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendConfirmEmail(email) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  const resend = new Resend(resendKey);
  const siteUrl = process.env.SITE_URL || 'https://taverne-du-clash.com';
  try {
    await resend.emails.send({
      from: 'TaverneDuClash <noreply@taverne-du-clash.com>',
      to: email,
      subject: 'Inscription confirmée — TaverneDuClash',
      html: buildConfirmHtml(siteUrl),
    });
  } catch (_) {}
}

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
