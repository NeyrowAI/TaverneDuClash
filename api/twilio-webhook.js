import { kv } from '@vercel/kv';
import { PLAYERS, ROLES, findPlayerByPhone, getNextClash } from './_config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const from = (req.body.From || '').replace('whatsapp:', '');
  const body = (req.body.Body || '').trim();

  // Trouver le joueur
  const player = findPlayerByPhone(from);
  if (!player) {
    return sendTwiml(res, '❓ Numéro non reconnu. Contacte un admin de TaverneDuClash.');
  }

  // Trouver le prochain Clash
  const clash = getNextClash();
  if (!clash) {
    return sendTwiml(res, '📅 Aucun Clash prévu pour le moment.');
  }

  const kvKey = `clash:${clash.date.split('T')[0]}`;
  let data = await kv.get(kvKey);

  if (!data) {
    data = {
      clashName: clash.name,
      clashDate: clash.date,
      reminderSent: false,
      responses: {}
    };
  }

  // Parser la réponse
  const normalized = body.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlever accents
    .trim();

  if (normalized.startsWith('non') || normalized.startsWith('no')) {
    data.responses[from] = {
      playerName: player.name,
      participating: false,
      role: null,
      respondedAt: new Date().toISOString()
    };
    await kv.set(kvKey, data);
    return sendTwiml(res, `❌ OK ${player.name}, c'est noté. Tu ne participes pas au ${clash.name}. Tu peux changer d'avis en répondant "OUI [rôle]" !`);
  }

  if (normalized.startsWith('oui') || normalized.startsWith('yes') || normalized.startsWith('ok')) {
    // Chercher le rôle dans le message
    const role = parseRole(normalized);

    if (!role) {
      return sendTwiml(res, `✅ Tu veux participer ! Mais quel rôle ?\n\nRéponds : OUI Top, OUI Jungle, OUI Mid, OUI ADC, ou OUI Support`);
    }

    // Vérifier si le rôle est déjà pris
    const roleTaken = Object.values(data.responses).find(
      r => r.participating && r.role === role && r.playerName !== player.name
    );

    if (roleTaken) {
      return sendTwiml(res, `⚠️ Le rôle ${role} est déjà pris par ${roleTaken.playerName}. Choisis un autre rôle :\n\nTop, Jungle, Mid, ADC, Support`);
    }

    // Vérifier le nombre de places
    const confirmed = Object.values(data.responses).filter(
      r => r.participating && r.playerName !== player.name
    );
    if (confirmed.length >= 5) {
      return sendTwiml(res, `😬 Désolé ${player.name}, les 5 places sont déjà prises pour le ${clash.name} ! Tu es sur la liste d'attente.`);
    }

    data.responses[from] = {
      playerName: player.name,
      participating: true,
      role: role,
      respondedAt: new Date().toISOString()
    };
    await kv.set(kvKey, data);

    const spotsLeft = 5 - (confirmed.length + 1);
    return sendTwiml(res, `✅ C'est validé ${player.name} ! Tu joues ${role} au ${clash.name}.\n\n${spotsLeft > 0 ? `🪑 ${spotsLeft} place(s) restante(s)` : '🔥 L\'équipe est complète !'}`);
  }

  // Message non compris
  return sendTwiml(res, `🤔 Je n'ai pas compris. Réponds :\n✅ OUI [rôle] (ex: OUI Jungle)\n❌ NON`);
}

function parseRole(text) {
  const roleMap = {
    'top': 'Top',
    'jungle': 'Jungle', 'jgl': 'Jungle', 'jungler': 'Jungle',
    'mid': 'Mid', 'middle': 'Mid',
    'adc': 'ADC', 'bot': 'ADC', 'bottom': 'ADC',
    'support': 'Support', 'supp': 'Support', 'sup': 'Support'
  };

  for (const [key, role] of Object.entries(roleMap)) {
    if (text.includes(key)) return role;
  }
  return null;
}

function sendTwiml(res, message) {
  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`);
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
