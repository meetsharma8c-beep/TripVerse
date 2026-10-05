// Vercel Serverless Function: Secure Server-Side ConCode AI Proxy
// Protects API keys from client exposure. Runs in Vercel Node environment.

export default async function handler(req, res) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, tripContext, sessionState } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ 
      ok: false, 
      error: 'NO_SERVER_KEY', 
      message: 'ConCode Neural in-browser engine is operating' 
    });
  }

  try {
    const dest = tripContext?.destination || sessionState?.destination || 'Worldwide';
    const days = tripContext?.durationDays || sessionState?.durationDays || 5;
    const budget = tripContext?.totalBudget || sessionState?.budget || 100000;

    const systemInstruction = 
      `You are ConCode AI, the intelligent travel co-pilot for TripVerse. ` +
      `Active context: Destination=${dest}, Duration=${days} days, Target Budget=₹${budget}. ` +
      `Adhere to TripVerse travel parameters: provide crisp, actionable, structured advice, transparent estimates, and zero hallucinations.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUser Traveler Query: "${query}"` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      return res.status(200).json({ ok: false, error: 'GEMINI_UPSTREAM_ERROR' });
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      return res.status(200).json({ ok: false, error: 'EMPTY_RESPONSE' });
    }

    return res.status(200).json({ ok: true, reply: replyText });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
  }
}
