export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RIOT_API_KEY not configured' });

  const parts = req.query.path || [];
  // parts example: ['account', 'by-riot-id', 'Theelk', 'EUW']
  const type = parts[0];
  let riotUrl = '';

  if (type === 'account' && parts[1] === 'by-riot-id' && parts.length >= 4) {
    const gameName = decodeURIComponent(parts[2]);
    const tagLine = decodeURIComponent(parts[3]);
    riotUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  } else if (type === 'summoner' && parts[1] === 'by-puuid' && parts[2]) {
    riotUrl = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${parts[2]}`;
  } else if (type === 'ranked' && parts[1] === 'by-puuid' && parts[2]) {
    riotUrl = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${parts[2]}`;
  } else if (type === 'mastery' && parts[1] === 'by-puuid' && parts[2]) {
    riotUrl = `https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${parts[2]}/top?count=5`;
  } else {
    return res.status(404).json({ error: 'Unknown route', path: parts });
  }

  try {
    const r = await fetch(riotUrl, { headers: { 'X-Riot-Token': apiKey } });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
