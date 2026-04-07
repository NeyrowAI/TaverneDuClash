const { kv } = require('@vercel/kv');
const { Resend } = require('resend');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function buildEmailHtml(siteUrl, recipientEmail) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#07030f;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#07030f;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#0f0a1a;border-radius:12px;border:1px solid #1a1228;">
        <!-- Logo -->
        <tr><td align="center" style="padding:40px 40px 20px;">
          <img src="${siteUrl}/logox.png" alt="TaverneDuClash" width="180" style="display:block;max-width:180px;height:auto;" />
        </td></tr>
        <!-- Title -->
        <tr><td align="center" style="padding:10px 40px 10px;">
          <h1 style="margin:0;font-size:28px;color:#c9a84c;font-weight:700;">La Taverne est ouverte !</h1>
        </td></tr>
        <!-- Divider -->
        <tr><td align="center" style="padding:10px 60px;">
          <div style="height:2px;background:linear-gradient(90deg,transparent,#a855f7,transparent);"></div>
        </td></tr>
        <!-- Body text -->
        <tr><td style="padding:20px 40px;color:#e8dff8;font-size:16px;line-height:1.6;text-align:center;">
          Tu t&rsquo;es inscrit sur la waitlist de <strong style="color:#c9a84c;">TaverneDuClash</strong>. L&rsquo;outil est maintenant disponible !<br><br>
          Cr&eacute;e ton profil pour rejoindre l&rsquo;&eacute;quipe.
        </td></tr>
        <!-- CTA Button -->
        <tr><td align="center" style="padding:20px 40px 40px;">
          <a href="${siteUrl}/register.html?email=${encodeURIComponent(recipientEmail)}"
             style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;border-radius:8px;letter-spacing:0.5px;">
            Cr&eacute;er mon profil
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding:20px 40px 30px;border-top:1px solid #1a1228;">
          <p style="margin:0;font-size:13px;color:#6b5f7d;line-height:1.5;">
            TaverneDuClash &mdash; L&rsquo;outil de draft ultime pour League of Legends Clash
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
