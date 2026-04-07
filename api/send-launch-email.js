const { kv } = require('@vercel/kv');
const { Resend } = require('resend');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function buildEmailHtml(siteUrl, recipientEmail) {
  const registerUrl = `${siteUrl}/register.html?email=${encodeURIComponent(recipientEmail)}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#160c28;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#160c28;">
    <tr><td align="center" style="padding:50px 20px;">

      <!-- MAIN CARD — inspired by waitlist section -->
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="border-radius:12px;border:1px solid rgba(168,85,247,0.25);overflow:hidden;">

        <!-- LOGO AREA -->
        <tr><td align="center" style="background-color:#1a0e30;padding:45px 40px 25px;">
          <img src="${siteUrl}/logox.png" alt="TaverneDuClash" width="120" style="display:block;max-width:120px;height:auto;" />
        </td></tr>

        <!-- EYEBROW -->
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;">Lancement officiel</p>
        </td></tr>

        <!-- TITLE -->
        <tr><td align="center" style="background-color:#1a0e30;padding:8px 40px 12px;">
          <h1 style="margin:0;font-size:26px;color:#e8dff8;font-weight:600;">La Taverne est ouverte</h1>
        </td></tr>

        <!-- DIVIDER — or + violet like the site -->
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 25px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="width:30px;height:2px;background-color:#a855f7;"></td>
              <td style="width:6px;"></td>
              <td style="width:30px;height:2px;background-color:#c9a84c;"></td>
            </tr>
          </table>
        </td></tr>

        <!-- BODY TEXT -->
        <tr><td style="background-color:#1a0e30;padding:0 50px 35px;">
          <p style="margin:0;color:#9d8fc0;font-size:16px;line-height:1.9;text-align:center;font-style:italic;">
            Tu t&rsquo;es inscrit sur la waitlist de TaverneDuClash. L&rsquo;outil de draft ultime pour Clash est maintenant disponible. Cr&eacute;e ton profil pour rejoindre la Taverne.
          </p>
        </td></tr>

        <!-- CTA BUTTON — same style as .btn-p on landing (violet bg, gold text) -->
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#3d1a6e;border:1px solid rgba(168,85,247,0.5);border-radius:4px;padding:16px 48px;text-align:center;">
              <a href="${registerUrl}" style="color:#f0d080;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;display:block;">
                Rejoindre la Taverne
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- SUBTLE HINT -->
        <tr><td align="center" style="background-color:#1a0e30;padding:0 40px 40px;">
          <p style="margin:0;font-size:12px;color:#6b5f7d;font-style:italic;">
            Stats en direct &middot; Coach IA &middot; Scout ennemi &middot; Rappels WhatsApp
          </p>
        </td></tr>

        <!-- FOOTER -->
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

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Set CORS headers
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  // Auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const siteUrl = process.env.SITE_URL || 'https://taverne-du-clash.com';
    const { testEmail } = req.body || {};

    // Build recipient list
    let recipients = [];

    if (testEmail) {
      recipients = [testEmail];
    } else {
      const raw = await kv.lrange('waitlist:emails', 0, -1) || [];
      recipients = raw.map(e => {
        try { return JSON.parse(e).email; } catch { return e; }
      }).filter(Boolean);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'Aucun email à envoyer' });
    }

    // Send emails one by one and collect results
    const results = [];
    for (const email of recipients) {
      try {
        const html = buildEmailHtml(siteUrl, email);
        const { data, error } = await resend.emails.send({
          from: testEmail
            ? 'TaverneDuClash <onboarding@resend.dev>'
            : 'TaverneDuClash <noreply@taverne-du-clash.com>',
          to: email,
          subject: 'TaverneDuClash est disponible ! Inscris-toi maintenant',
          html,
        });

        if (error) {
          results.push({ email, status: 'error', error: error.message });
        } else {
          results.push({ email, status: 'sent', id: data?.id });
        }
      } catch (err) {
        results.push({ email, status: 'error', error: err.message });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const errors = results.filter(r => r.status === 'error').length;

    return res.status(200).json({
      message: `Envoi terminé : ${sent} envoyé(s), ${errors} erreur(s)`,
      total: recipients.length,
      sent,
      errors,
      details: results,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
