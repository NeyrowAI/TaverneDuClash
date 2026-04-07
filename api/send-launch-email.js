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
<body style="margin:0;padding:0;background-color:#0e0818;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0818;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;border:1px solid rgba(168,85,247,0.2);">
        <!-- HEADER with gradient background -->
        <tr><td align="center" style="background:linear-gradient(160deg,#1a0e30 0%,#2d1557 50%,#1a0e30 100%);padding:50px 40px 30px;">
          <img src="${siteUrl}/logox.png" alt="TaverneDuClash" width="140" style="display:block;max-width:140px;height:auto;margin-bottom:24px;" />
          <h1 style="margin:0;font-size:30px;color:#f0d080;font-weight:700;letter-spacing:1px;">La Taverne est ouverte !</h1>
          <div style="width:80px;height:3px;background:linear-gradient(90deg,#c9a84c,#a855f7);margin:16px auto 0;border-radius:2px;"></div>
        </td></tr>
        <!-- BODY -->
        <tr><td style="background:linear-gradient(180deg,#160c28,#0e0818);padding:35px 45px;">
          <p style="margin:0 0 10px;color:#e8dff8;font-size:17px;line-height:1.8;text-align:center;">
            Tu t&rsquo;es inscrit sur la waitlist de <strong style="color:#c9a84c;">TaverneDuClash</strong>.
          </p>
          <p style="margin:0 0 30px;color:#e8dff8;font-size:17px;line-height:1.8;text-align:center;">
            L&rsquo;outil est maintenant disponible ! Cr&eacute;e ton profil pour rejoindre l&rsquo;&eacute;quipe.
          </p>
          <!-- CTA BUTTON — large, eye-catching -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;box-shadow:0 8px 30px rgba(124,58,237,0.4),0 4px 15px rgba(201,168,76,0.15);">
                <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#7c3aed);padding:3px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;">
                    <tr><td style="background:linear-gradient(135deg,#3d1a6e,#7c3aed);padding:18px 50px;text-align:center;">
                      <a href="${registerUrl}" style="color:#f0d080;text-decoration:none;font-size:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;display:block;">
                        Cr&eacute;er mon profil
                      </a>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;text-align:center;font-size:13px;color:#9d8fc0;font-style:italic;">
            Clique sur le bouton ci-dessus pour finaliser ton inscription.
          </p>
        </td></tr>
        <!-- FEATURES teaser -->
        <tr><td style="background:#0b0614;padding:30px 45px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:10px;">
                <div style="font-size:24px;margin-bottom:6px;">&#9876;</div>
                <div style="color:#c9a84c;font-size:12px;font-weight:700;letter-spacing:1px;">DRAFT IA</div>
              </td>
              <td width="33%" style="text-align:center;padding:10px;">
                <div style="font-size:24px;margin-bottom:6px;">&#128269;</div>
                <div style="color:#c9a84c;font-size:12px;font-weight:700;letter-spacing:1px;">SCOUT</div>
              </td>
              <td width="33%" style="text-align:center;padding:10px;">
                <div style="font-size:24px;margin-bottom:6px;">&#128172;</div>
                <div style="color:#c9a84c;font-size:12px;font-weight:700;letter-spacing:1px;">COACH IA</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- FOOTER -->
        <tr><td align="center" style="background:#07030f;padding:25px 40px;border-top:1px solid rgba(168,85,247,0.15);">
          <p style="margin:0;font-size:13px;color:#6b5f7d;line-height:1.6;">
            TaverneDuClash &mdash; L&rsquo;outil de draft ultime pour League of Legends Clash
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#4a3f5e;">
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
