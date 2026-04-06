export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  try {
    const body = req.body || {};

    const messages = [];
    if (body.system) {
      messages.push({ role: 'system', content: body.system });
    }
    if (body.messages) {
      messages.push(...body.messages);
    }

    const groqBody = {
      model: 'llama-3.3-70b-versatile',
      max_tokens: body.max_tokens || 1000,
      messages: messages,
      temperature: 0.7
    };

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify(groqBody)
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || 'Groq error' });
    }

    const anthropicFormat = {
      content: [{ type: 'text', text: data.choices[0].message.content }]
    };

    return res.status(200).json(anthropicFormat);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
