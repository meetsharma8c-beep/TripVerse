import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function concodeApiDevPlugin(targetUrl?: string, apiKey?: string): Plugin {
  return {
    name: 'concode-api-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/chat')) {
          return next();
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        const activeUrl = targetUrl || process.env.CONCODE_API_URL || process.env.VITE_CONCODE_API_URL;
        if (!activeUrl) {
          res.statusCode = 503;
          return res.end(JSON.stringify({
            ok: false,
            status: 'offline',
            error: 'CONCODE_NOT_CONFIGURED',
            message: 'Set CONCODE_API_URL or VITE_CONCODE_API_URL in .env to connect to your Kaggle GPU instance'
          }));
        }

        // Health check
        if (req.method === 'GET' || req.url.includes('action=health')) {
          try {
            const start = Date.now();
            const ping = await fetch(`${activeUrl}/health`, {
              headers: {
                ...(apiKey ? { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}),
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'TripVerse-Client/1.0'
              }
            });
            const data = await ping.json().catch(() => ({}));
            res.statusCode = 200;
            return res.end(JSON.stringify({
              ok: ping.ok,
              status: ping.ok ? 'online' : 'error',
              latencyMs: Date.now() - start,
              details: data
            }));
          } catch (err: any) {
            res.statusCode = 200;
            return res.end(JSON.stringify({ ok: false, status: 'unreachable', error: err?.message }));
          }
        }

        // POST request
        let bodyRaw = '';
        req.on('data', chunk => { bodyRaw += chunk; });
        req.on('end', async () => {
          try {
            const body = bodyRaw ? JSON.parse(bodyRaw) : {};
            if (body.action === 'health') {
              const ping = await fetch(`${activeUrl}/health`, {
                headers: {
                  ...(apiKey ? { 'X-API-Key': apiKey } : {}),
                  'ngrok-skip-browser-warning': 'true',
                  'User-Agent': 'TripVerse-Client/1.0'
                }
              });
              const data = await ping.json().catch(() => ({}));
              res.statusCode = 200;
              return res.end(JSON.stringify({ ok: ping.ok, status: ping.ok ? 'online' : 'error', details: data }));
            }

            const upstream = await fetch(`${activeUrl}/api/v1/travel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}),
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'TripVerse-Client/1.0'
              },
              body: JSON.stringify({
                query: body.query,
                trip_context: body.tripContext,
                session_id: body.sessionState?.sessionId,
                mode: body.mode || 'text'
              })
            });

            const data: any = await upstream.json().catch(() => ({}));
            res.statusCode = upstream.ok ? 200 : upstream.status || 502;
            const replyText = typeof data.reply === 'string' ? data.reply : (typeof data.response === 'string' ? data.response : '');

            let itinerary = data.itinerary;
            let structuredItinerary = data.structured_itinerary || data.structuredItinerary;

            if (!itinerary && typeof replyText === 'string') {
              try {
                const parsed = JSON.parse(replyText);
                if (parsed && Array.isArray(parsed.itinerary)) {
                  itinerary = parsed.itinerary;
                  structuredItinerary = { days: parsed.itinerary };
                }
              } catch {
                const s = replyText.indexOf('{');
                const e = replyText.lastIndexOf('}');
                if (s >= 0 && e > s) {
                  try {
                    const parsed = JSON.parse(replyText.slice(s, e + 1));
                    if (parsed && Array.isArray(parsed.itinerary)) {
                      itinerary = parsed.itinerary;
                      structuredItinerary = { days: parsed.itinerary };
                    }
                  } catch {}
                }
              }
            }

            return res.end(JSON.stringify({
              ok: upstream.ok,
              reply: replyText,
              sessionId: data.session_id || data.sessionId,
              mode: data.mode || body.mode,
              isEstimate: data.is_estimate !== false,
              guild: data.guild || 'ai_ml',
              itinerary,
              structuredItinerary: structuredItinerary || (Array.isArray(itinerary) ? { days: itinerary } : undefined),
              budgetBreakdown: data.budget_breakdown || data.budgetBreakdown,
              actionButtons: data.action_buttons || data.actionButtons,
              modificationBadge: data.modification_badge || data.modificationBadge
            }));
          } catch (err: any) {
            res.statusCode = 502;
            return res.end(JSON.stringify({ ok: false, error: 'CONCODE_UPSTREAM_ERROR', message: err?.message }));
          }
        });
      });
    }
  };
}

function smsApiDevPlugin(): Plugin {
  return {
    name: 'sms-api-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/sms')) {
          return next();
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        let bodyRaw = '';
        req.on('data', chunk => { bodyRaw += chunk; });
        req.on('end', async () => {
          try {
            const body = bodyRaw ? JSON.parse(bodyRaw) : {};
            const { numbers, variables_values, apiKey: clientApiKey } = body;
            const authHeader = req.headers['authorization'];
            const apiKey = 
              process.env.FAST2SMS_API_KEY || 
              process.env.VITE_FAST2SMS_API_KEY || 
              authHeader || 
              clientApiKey;

            if (!numbers || !variables_values) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ return: false, message: 'Missing phone number or OTP code.' }));
            }

            const fastResponse = await fetch('https://www.fast2sms.com/dev/bulkV2', {
              method: 'POST',
              headers: {
                'authorization': String(apiKey),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                route: 'otp',
                variables_values: String(variables_values),
                numbers: String(numbers)
              })
            });

            const data = await fastResponse.json().catch(() => ({ return: false, message: 'Invalid response from Fast2SMS' }));
            res.statusCode = fastResponse.status || 200;
            return res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ return: false, message: err?.message || 'SMS gateway network proxy error' }));
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const concodeUrl = (env.CONCODE_API_URL || env.VITE_CONCODE_API_URL || '').trim().replace(/\/$/, '');
  const concodeKey = (env.CONCODE_API_KEY || '').trim();

  return {
    plugins: [
      react(),
      tailwindcss(),
      concodeApiDevPlugin(concodeUrl, concodeKey),
      smsApiDevPlugin()
    ],
    build: {
      target: ['es2020', 'edge88', 'firefox78', 'chrome80', 'safari14'],
      cssTarget: ['chrome80', 'safari14'],
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/@supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/@capacitor/')) {
              return 'vendor-capacitor';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/leaflet/')) {
              return 'vendor-leaflet';
            }
            if (id.includes('node_modules/canvas-confetti/')) {
              return 'vendor-confetti';
            }
          },
        }
      }
    }
  };
});

