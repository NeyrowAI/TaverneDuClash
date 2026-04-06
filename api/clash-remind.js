import twilio from 'twilio';
import { kv } from '@vercel/kv';
import { PLAYERS, CLASHES, getClashInDays } from './_config.js';

export default async function handler(req, res) {
  // Sécurité : vérifier que c'est bien le cron Vercel qui appelle
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const clash = getClashInDays(2);
  if (!clash) {
    return res.status(200).json({ message: 'Aucun Clash dans 2 jours' });
  }

  const kvKey = `clash:${clash.date.split('T')[0]}`;
  const existing = await kv.get(kvKey);

  if (existing && existing.reminderSent) {
    return res.status(200).json({ message: 'Rappel déjà envoyé' });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  const clashDate = new Date(clash.date);
  const dateStr = clashDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const playersWithPhone = PLAYERS.filter(p => p.phone);
  const results = [];

  for (const player of playersWithPhone) {
    try {
      await client.messages.create({
        from,
        to: `whatsapp:${player.phone}`,
        body: `⚔️ ${clash.name} — Clash dans 2 jours ! (${dateStr})\n\n🏆 Tu participes ?\n\nRéponds :\n✅ OUI [rôle] (ex: OUI Jungle)\n❌ NON\n\nRôles : Top, Jungle, Mid, ADC, Support\n\n— TaverneDuClash`
      });
      results.push({ player: player.name, status: 'sent' });
    } catch (e) {
      results.push({ player: player.name, status: 'error', error: e.message });
    }
  }

  // Initialiser les données du Clash dans KV
  await kv.set(kvKey, {
    clashName: clash.name,
    clashDate: clash.date,
    reminderSent: true,
    responses: existing?.responses || {}
  });

  return res.status(200).json({ message: 'Rappels envoyés', results });
}
