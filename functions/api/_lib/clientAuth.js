const COOKIE_NAME = 'client_session';
const SESSION_DAYS = 30;

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const out = {};
  header.split(';').forEach(function (part) {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

export function sessionCookieHeader(token, maxAgeSeconds) {
  const parts = [
    COOKIE_NAME + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=' + maxAgeSeconds
  ];
  return parts.join('; ');
}

export function clearSessionCookieHeader() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export async function createClientSession(env, clientId) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600000).toISOString();
  await env.DB.prepare(
    'INSERT INTO client_sessions (client_id, token, expires_at) VALUES (?, ?, ?)'
  ).bind(clientId, token, expiresAt).run();
  return { token: token, maxAge: SESSION_DAYS * 24 * 3600 };
}

export async function destroyClientSession(env, token) {
  if (!token) return;
  await env.DB.prepare('DELETE FROM client_sessions WHERE token = ?').bind(token).run();
}

// Resolves the logged-in client from the request's session cookie, or null
// if there isn't one / it's expired. Never throws - callers just treat a
// null return as "not logged in".
export async function requireClientSession(request, env) {
  try {
    const cookies = parseCookies(request);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    const session = await env.DB.prepare(
      "SELECT * FROM client_sessions WHERE token = ? AND expires_at > datetime('now')"
    ).bind(token).first();
    if (!session) return null;

    const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(session.client_id).first();
    return client || null;
  } catch (err) {
    console.log('requireClientSession failed: ' + String(err && err.message));
    return null;
  }
}

export function getSessionToken(request) {
  return parseCookies(request)[COOKIE_NAME] || null;
}
