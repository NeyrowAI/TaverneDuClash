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
<body style="margin:0;padding:0;background-color:#160c28;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#160c28;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;border:1px solid rgba(201,168,76,0.18);">
        <!-- HEADER — violet profond avec accent doré -->
        <tr><td style="background-color:#1a0e30;padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="background-color:#2d1557;padding:50px 40px 30px;">
              <img src="${siteUrl}/logox.png" alt="TaverneDuClash" width="140" style="display:block;max-width:140px;height:auto;margin-bottom:24px;" />
              <h1 style="margin:0;font-size:30px;color:#f0d080;font-weight:700;letter-spacing:1px;">La Taverne est ouverte !</h1>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px auto 0;">
                <tr>
                  <td style="width:40px;height:3px;background-color:#c9a84c;"></td>
                  <td style="width:40px;height:3px;background-color:#a855f7;"></td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <!-- BODY — fond violet moyen, pas noir -->
        <tr><td style="background-color:#1a0e30;padding:35px 45px;">
          <p style="margin:0 0 10px;color:#e8dff8;font-size:17px;line-height:1.8;text-align:center;">
            Tu t&rsquo;es inscrit sur la waitlist de <strong style="color:#f0d080;">TaverneDuClash</strong>.
          </p>
          <p style="margin:0 0 35px;color:#e8dff8;font-size:17px;line-height:1.8;text-align:center;">
            L&rsquo;outil est maintenant disponible ! Cr&eacute;e ton profil pour rejoindre l&rsquo;&eacute;quipe.
          </p>
          <!-- CTA BUTTON — dor&#233; lumineux, impossible &#224; rater -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:10px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr><td style="background-color:#7c3aed;padding:3px;border-radius:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr><td style="background-color:#c9a84c;border-radius:10px;padding:20px 55px;text-align:center;">
                      <a href="${registerUrl}" style="color:#07030f;text-decoration:none;font-size:20px;font-weight:800;letter-spacing:2px;text-transform:uppercase;display:block;">
                        CR&Eacute;ER MON PROFIL
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
        <!-- FEATURES — texte styl&#233;, sans emoji -->
        <tr><td style="background-color:#160c28;padding:30px 45px;border-top:1px solid rgba(201,168,76,0.18);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:12px 8px;vertical-align:top;">
                <div style="color:#a855f7;font-size:26px;font-weight:800;margin-bottom:6px;font-family:Georgia,serif;">/</div>
                <div style="color:#f0d080;font-size:13px;font-weight:700;letter-spacing:1.5px;">DRAFT IA</div>
                <div style="color:#9d8fc0;font-size:11px;margin-top:4px;">Composition optimale</div>
              </td>
              <td width="33%" style="text-align:center;padding:12px 8px;vertical-align:top;">
                <div style="color:#a855f7;font-size:26px;font-weight:800;margin-bottom:6px;font-family:Georgia,serif;">&gt;</div>
                <div style="color:#f0d080;font-size:13px;font-weight:700;letter-spacing:1.5px;">SCOUT</div>
                <div style="color:#9d8fc0;font-size:11px;margin-top:4px;">Analyse adversaire</div>
              </td>
              <td width="33%" style="text-align:center;padding:12px 8px;vertical-align:top;">
                <div style="color:#a855f7;font-size:26px;font-weight:800;margin-bottom:6px;font-family:Georgia,serif;">*</div>
                <div style="color:#f0d080;font-size:13px;font-weight:700;letter-spacing:1.5px;">COACH IA</div>
                <div style="color:#9d8fc0;font-size:11px;margin-top:4px;">Strat&eacute;gie sur mesure</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- FOOTER -->
        <tr><td align="center" style="background-color:#0e0818;padding:25px 40px;border-top:1px solid rgba(168,85,247,0.25);">
          <p style="margin:0;font-size:13px;color:#9d8fc0;line-height:1.6;">
            <strong style="color:#c9a84c;">TaverneDuClash</strong> &mdash; L&rsquo;outil de draft ultime pour League of Legends Clash
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#6b5f7d;">
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
