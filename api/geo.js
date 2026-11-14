// Vercel Serverless Function: Visitor Geo & Currency Resolver
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const country = req.headers['x-vercel-ip-country'] || 'IN';
  const city = req.headers['x-vercel-ip-city'] || '';
  const region = req.headers['x-vercel-ip-country-region'] || '';

  return res.status(200).json({
    ok: true,
    country: String(country).toUpperCase(),
    city: decodeURIComponent(String(city)),
    region: String(region)
  });
}
