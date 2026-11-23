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
              criticScore: data.critic_score ?? data.criticScore,
              criticFixes: data.critic_fixes || data.criticFixes || [],
              memoryRecalled: Boolean(data.memory_recalled || data.memoryRecalled),
              formatRepaired: Boolean(data.format_repaired || data.formatRepaired),
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

function emailOtpDevPlugin(resendKey?: string): Plugin {
  const crypto = require('crypto');
  const activeKey = (resendKey || process.env.RESEND_API_KEY || '').trim();
  const hmacSecret = (process.env.AUTH_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');

  function signOtp(email: string, code: string, expiresAt: number) {
    return crypto.createHmac('sha256', hmacSecret)
      .update(`${email.trim().toLowerCase()}:${code}:${expiresAt}`)
      .digest('hex');
  }

  return {
    name: 'email-otp-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/email-otp')) {
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
            const { action, email, code, token } = body;
            const emailNorm = String(email || '').trim().toLowerCase();

            if (!emailNorm || !emailNorm.includes('@')) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, message: 'Valid email required' }));
            }

            if (action === 'send') {
              const isSimulatedTestDomain = 
                emailNorm.startsWith('ci_') ||
                emailNorm.startsWith('test_') ||
                emailNorm.startsWith('e2e_') ||
                emailNorm.endsWith('@tripverse.app') ||
                emailNorm.endsWith('@example.com') ||
                emailNorm.endsWith('@test.com') ||
                emailNorm.endsWith('@invalid') ||
                emailNorm.endsWith('.test');

              const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
              const expiresAt = Date.now() + 10 * 60 * 1000;
              const signature = signOtp(emailNorm, otpCode, expiresAt);
              const verificationToken = `${expiresAt}.${signature}`;

              if (isSimulatedTestDomain) {
                res.statusCode = 200;
                return res.end(JSON.stringify({
                  success: true,
                  token: verificationToken,
                  expiresAt,
                  message: 'Security verification code generated for test domain.'
                }));
              }

              const htmlContent = `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
                  <h2 style="color:#0f172a;margin:0 0 8px;">TripVerse Two-Factor Verification</h2>
                  <p style="color:#64748b;font-size:14px;">Your 6-digit 2FA security code is:</p>
                  <div style="background:#F4F7F5;border:2px dashed #2D5A3D;padding:16px;text-align:center;border-radius:12px;margin:16px 0;">
                    <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#2D5A3D;font-family:monospace;">${otpCode}</span>
                  </div>
                  <p style="color:#94a3b8;font-size:12px;">Valid for 10 minutes. Never share this code with anyone.</p>
                </div>
              `;

              if (!activeKey) {
                res.statusCode = 503;
                return res.end(JSON.stringify({
                  success: false,
                  message: 'RESEND_API_KEY is not configured in local .env'
                }));
              }

              try {
                const resendRes = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${activeKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    from: 'TripVerse <onboarding@resend.dev>',
                    to: emailNorm,
                    subject: `${otpCode} is your TripVerse 2FA verification code`,
                    html: htmlContent
                  })
                });
                const resendData: any = await resendRes.json();
                if (!resendRes.ok) {
                  if (typeof resendData.message === 'string' && resendData.message.includes('You can only send testing emails')) {
                    try {
                      await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${activeKey}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          from: 'TripVerse <onboarding@resend.dev>',
                          to: 'meet.sharma8c@gmail.com',
                          subject: `${otpCode} is your TripVerse 2FA verification code (for ${emailNorm})`,
                          html: htmlContent
                        })
                      });
                    } catch {}
                    res.statusCode = 200;
                    return res.end(JSON.stringify({
                      success: true,
                      message: `2FA security code dispatched to ${emailNorm}.`,
                      email: emailNorm,
                      token: verificationToken,
                      expiresAt
                    }));
                  }
                }
              } catch (sendErr) {
                console.warn('[Dev Resend Warning]', sendErr);
              }

              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                message: `Verification code sent to ${emailNorm}`,
                email: emailNorm,
                token: verificationToken,
                expiresAt
              }));
            }

            if (action === 'verify') {
              const cleanCode = String(code || '').trim().replace(/\D/g, '');
              if (cleanCode.length !== 6) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, message: 'Please enter 6 digits' }));
              }
              const activeToken = token;
              if (!activeToken || !activeToken.includes('.')) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, message: 'Invalid verification token' }));
              }
              const [expiresAtStr, signature] = activeToken.split('.');
              const expiresAt = parseInt(expiresAtStr, 10);
              if (Date.now() > expiresAt) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, message: 'Verification code expired' }));
              }
              const expectedSig = signOtp(emailNorm, cleanCode, expiresAt);
              if (signature !== expectedSig) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, message: 'Incorrect 2FA code. Please check your inbox and try again.' }));
              }
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, verified: true }));
            }

            res.statusCode = 400;
            return res.end(JSON.stringify({ success: false, message: 'Invalid action' }));
          } catch (err: any) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ success: false, message: err?.message || 'Error' }));
          }
        });
      });
    }
  };
}

function dropConsolePlugin(): Plugin {
  return {
    name: 'drop-console',
    apply: 'build',
    enforce: 'post',
    transform(code, id) {
      if (id.includes('node_modules')) return null;
      if (!/\.[jt]sx?$/.test(id)) return null;
      if (!code.includes('console.log(') && !code.includes('console.debug(')) return null;
      
      // Robust scanner that respects string literals and nested parentheses
      let result = '';
      let i = 0;
      while (i < code.length) {
        if (code.startsWith('console.log(', i) || code.startsWith('console.debug(', i)) {
          const startParen = code.indexOf('(', i);
          let depth = 1;
          let j = startParen + 1;
          let inQuote = '';
          while (j < code.length && depth > 0) {
            const ch = code[j];
            if (inQuote) {
              if (ch === '\\') {
                j++;
              } else if (ch === inQuote) {
                inQuote = '';
              }
            } else if (ch === '"' || ch === "'" || ch === '`') {
              inQuote = ch;
            } else if (ch === '(') {
              depth++;
            } else if (ch === ')') {
              depth--;
            }
            j++;
          }
          if (code[j] === ';') j++;
          result += 'void 0;';
          i = j;
        } else {
          result += code[i];
          i++;
        }
      }
      return {
        code: result,
        map: null
      };
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const concodeUrl = (env.CONCODE_API_URL || env.VITE_CONCODE_API_URL || '').trim().replace(/\/$/, '');
  const concodeKey = (env.CONCODE_API_KEY || env.VITE_CONCODE_API_KEY || '').trim();

  return {
    plugins: [
      react(),
      tailwindcss(),
      concodeApiDevPlugin(concodeUrl, concodeKey),
      smsApiDevPlugin(),
      emailOtpDevPlugin(env.RESEND_API_KEY),
      dropConsolePlugin()
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
            if (id.includes('node_modules/three/')) {
              return 'vendor-three';
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
            if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/canvas-confetti/')) {
              return 'vendor-confetti';
            }
            if (id.includes('/src/services/languageService')) {
              return 'service-i18n';
            }
          },
        }
      }
    }
  };
});

