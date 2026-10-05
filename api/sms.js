// Vercel Serverless Function: Secure Server-Side Fast2SMS Gateway Proxy
// Bypasses browser CORS restrictions by dispatching SMS server-to-server.

export default async function handler(req, res) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { numbers, variables_values, apiKey: clientApiKey } = req.body || {};
  const authHeader = req.headers['authorization'];
  
  const apiKey = 
    process.env.FAST2SMS_API_KEY || 
    process.env.VITE_FAST2SMS_API_KEY || 
    authHeader || 
    clientApiKey || 
    '';

  if (!numbers || !variables_values) {
    return res.status(400).json({ return: false, message: 'Missing phone number or OTP code.' });
  }

  try {
    const payload = {
      route: 'otp',
      variables_values: String(variables_values),
      numbers: String(numbers)
    };

    const fastResponse = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await fastResponse.json();
    return res.status(fastResponse.status || 200).json(data);
  } catch (err) {
    console.error('Fast2SMS proxy error:', err);
    return res.status(500).json({ return: false, message: 'SMS gateway network proxy error.' });
  }
}
