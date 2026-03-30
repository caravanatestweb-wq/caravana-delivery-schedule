// Vercel Serverless Function: CORS bridge for TextMagic
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, phones, username: bodyUser, apiKey: bodyKey } = req.body;
  const username = bodyUser || process.env.TM_USERNAME;
  const apiKey = bodyKey || process.env.TM_APIKEY;

  if (!username || !apiKey) {
    return res.status(500).json({ error: 'TextMagic credentials not set. Please configure them in the Office Hub Settings (⚙️).' });
  }

  try {
    const response = await fetch('https://rest.textmagic.com/api/v2/messages', {
      method: 'POST',
      headers: {
        'X-TM-Username': username,
        'X-TM-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, phones }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('SMS relay error:', err);
    return res.status(500).json({ error: 'Failed to connect to TextMagic API.' });
  }
}
