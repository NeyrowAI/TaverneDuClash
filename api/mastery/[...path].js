export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RIOT_API_KEY not configured' });

  try {
    const parts = req.query.path || [];
    if (parts[0] === 'by-puuid' && parts[1]) {
      const puuid = parts[1];
      const riotUrl = `https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`;

      const r = await fetch(riotUrl, { headers: { 'X-Riot-Token': apiKey } });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(404).json({ error: 'Unknown mastery route' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
