import { kv } from '@vercel/kv';
import { PLAYERS, ROLES, getNextClash } from './_config.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const clash = getNextClash();
  if (!clash) {
    return res.status(200).json({
      clashName: null,
      clashDate: null,
      participants: [],
      declined: [],
      pending: [],
      rolesFilled: {},
      rolesAvailable: ROLES,
      spotsLeft: 5
    });
  }

  const kvKey = `clash:${clash.date.split('T')[0]}`;
  const data = await kv.get(kvKey);

  const responses = data?.responses || {};

  const participants = [];
  const declined = [];
  const pending = [];

  const rolesFilled = {};
  ROLES.forEach(r => rolesFilled[r] = null);

  for (const player of PLAYERS) {
    // Trouver la réponse par nom (on ne retourne jamais les numéros)
    const response = Object.values(responses).find(r => r.playerName === player.name);

    if (!response) {
      pending.push({ name: player.name, status: 'pending' });
    } else if (response.participating) {
      participants.push({ name: player.name, role: response.role, status: 'confirmed' });
      if (response.role && ROLES.includes(response.role)) {
        rolesFilled[response.role] = player.name;
      }
    } else {
      declined.push({ name: player.name, status: 'declined' });
    }
  }

  const rolesAvailable = ROLES.filter(r => !rolesFilled[r]);
  const spotsLeft = 5 - participants.length;

  return res.status(200).json({
    clashName: clash.name,
    clashDate: clash.date,
    participants,
    declined,
    pending,
    rolesFilled,
    rolesAvailable,
    spotsLeft
  });
}
