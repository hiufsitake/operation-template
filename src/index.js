// COMPANY Portal — Cloudflare Worker
// Secrets (set as encrypted Worker secrets via GitHub Actions, NEVER in source):
//   env.GEMINI_API_KEY  — Google Generative Language (Gemini) API key
//   env.RESEND_API_KEY  — Resend email API key
// These never reach the browser. The browser only ever talks to this Worker.

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
// Anon key is already public (it ships in every page) — safe to keep in source.
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';

// Only requests coming from these origins may use the proxies.
// The production custom domain is exact; the Cloudflare *.workers.dev subdomain
// is matched by pattern so we don't have to hardcode the account name.
const ALLOWED_ORIGINS = [
  'https://portal.example.com',
];
const WORKERS_DEV_RE = /^https:\/\/operation-template\.[a-z0-9-]+\.workers\.dev$/;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const GEMINI_PREFIX = '/api/gemini';

function originAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || WORKERS_DEV_RE.test(origin);
}

// Decide which origin (if any) we echo back in CORS headers.
function resolveOrigin(request) {
  const origin = request.headers.get('Origin');
  if (originAllowed(origin)) return origin;
  // Some same-origin requests omit Origin; fall back to Referer.
  const referer = request.headers.get('Referer') || '';
  try {
    const refOrigin = referer ? new URL(referer).origin : '';
    if (originAllowed(refOrigin)) return refOrigin;
  } catch {}
  return null;
}

function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Goog-Upload-Protocol, X-Goog-Upload-Header-Content-Type, X-Goog-Upload-Command, X-Goog-Upload-Offset',
    'Access-Control-Max-Age': '86400',
  };
}

// Admins are always allowed (mirror of the client-side ADMIN_EMAILS).
const ADMIN_EMAILS = [
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com',
];

// Authorize the caller as a COMPANY *staff member* (or admin).
// Returns true only if the Supabase token is valid AND the email is either an
// admin or present in the `staff` directory. This blocks random self-registered
// accounts from using the AI proxy (quota abuse), not just anonymous callers.
async function isAuthorizedStaff(request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  try {
    const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON },
    });
    if (!who.ok) return false;
    const user = await who.json();
    const rawEmail = user?.email || '';
    if (!rawEmail) return false;
    if (ADMIN_EMAILS.includes(rawEmail.toLowerCase())) return true;
    // Must exist in the staff directory. Query with the user's own token so RLS applies.
    const sres = await fetch(
      `${SUPABASE_URL}/rest/v1/staff?select=id&limit=1&email=eq.${encodeURIComponent(rawEmail)}`,
      { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON } }
    );
    if (!sres.ok) return false;
    const rows = await sres.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = resolveOrigin(request);

    // ---- CORS preflight (for both proxies) ----
    if (request.method === 'OPTIONS' &&
        (url.pathname === '/api/send-email' || url.pathname.startsWith(GEMINI_PREFIX))) {
      return new Response(null, { headers: corsHeaders(allowedOrigin) });
    }

    // ---- Gemini proxy: /api/gemini/* → Google Generative Language API ----
    if (url.pathname.startsWith(GEMINI_PREFIX)) {
      // 1. Origin lock (defense in depth)
      if (!allowedOrigin) {
        return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
      // 2. Must be a logged-in COMPANY staff member (or admin)
      if (!(await isAuthorizedStaff(request))) {
        return new Response(JSON.stringify({ error: 'Not authorized — COMPANY staff login required.' }), {
          status: 403, headers: { ...corsHeaders(allowedOrigin), 'Content-Type': 'application/json' },
        });
      }
      // 3. Forward to Google with the secret key injected server-side
      const upstreamPath = url.pathname.slice(GEMINI_PREFIX.length); // e.g. /v1beta/models
      const googleUrl = new URL(GEMINI_BASE + upstreamPath + url.search);
      googleUrl.searchParams.set('key', env.GEMINI_API_KEY);

      // Only forward safe headers; never forward the Supabase token to Google.
      const fwdHeaders = {};
      const passThrough = [
        'Content-Type',
        'X-Goog-Upload-Protocol',
        'X-Goog-Upload-Header-Content-Type',
        'X-Goog-Upload-Command',
        'X-Goog-Upload-Offset',
      ];
      for (const h of passThrough) {
        const v = request.headers.get(h);
        if (v) fwdHeaders[h] = v;
      }

      const init = { method: request.method, headers: fwdHeaders };
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.arrayBuffer();
      }

      const res = await fetch(googleUrl, init);
      const respHeaders = {
        ...corsHeaders(allowedOrigin),
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      };
      return new Response(res.body, { status: res.status, headers: respHeaders });
    }

    // ---- Email proxy: POST /api/send-email → Resend API ----
    if (request.method === 'POST' && url.pathname === '/api/send-email') {
      // Origin lock (no login gate — keeps po/cashclaim/staffclaim/leave/reports email flows working)
      if (!allowedOrigin) {
        return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
      const body = await request.json();
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders(allowedOrigin), 'Content-Type': 'application/json' },
      });
    }

    // ---- Everything else → static assets ----
    return env.ASSETS.fetch(request);
  },
};
