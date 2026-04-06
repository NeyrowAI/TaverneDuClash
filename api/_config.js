// Config partagée — ce fichier n'est PAS exposé comme endpoint (préfixe _)

export const PLAYERS = [
  { name: 'Theelk',    riotId: 'Theelk#EUW',       phone: '' },
  { name: 'Jey',       riotId: 'Jey#2321',          phone: '' },
  { name: 'Celadon',   riotId: 'Celadon#Crabe',     phone: '' },
  { name: 'Nero',      riotId: 'Nero#oreN',         phone: '+32496060604' },
  { name: 'Timotix',   riotId: 'Timotix#1234',      phone: '' },
  { name: 'Eracci',    riotId: 'Eracci#EUW',        phone: '' },
  { name: 'Finement2', riotId: 'finement 2#EUW',    phone: '' },
  { name: 'Ikao95',    riotId: 'Ikao95#EUW',        phone: '' },
];

export const CLASHES = [
  { name: 'Ixtal Cup',      date: '2026-04-18T18:00:00' },
  { name: 'Prochain Clash',  date: '2026-06-20T18:00:00' },
];

export const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

export function findPlayerByPhone(phone) {
  // Normalise: enlève espaces, tirets
  const clean = phone.replace(/[\s\-]/g, '');
  return PLAYERS.find(p => p.phone && clean.endsWith(p.phone.replace(/[\s\-]/g, '').slice(-9)));
}

export function getNextClash() {
  const now = new Date();
  return CLASHES.find(c => new Date(c.date) > now) || null;
}

export function getClashInDays(days) {
  const now = new Date();
  const target = new Date();
  target.setDate(target.getDate() + days);

  return CLASHES.find(c => {
    const clashDate = new Date(c.date);
    return clashDate.toDateString() === target.toDateString();
  }) || null;
}
