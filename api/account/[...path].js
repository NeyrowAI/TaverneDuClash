export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RIOT_API_KEY not configured' });

  try {
    // path = ['by-riot-id', gameName, tagLine]
    const parts = req.query.path || [];
    if (parts[0] === 'by-riot-id' && parts.length >= 3) {
      const gameName = decodeURIComponent(parts[1]);
      const tagLine = decodeURIComponent(parts[2]);
      const riotUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

      const r = await fetch(riotUrl, { headers: { 'X-Riot-Token': apiKey } });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(404).json({ error: 'Unknown account route' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
