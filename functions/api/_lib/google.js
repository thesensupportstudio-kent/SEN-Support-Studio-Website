const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function getStoredAuth(env) {
  return env.DB.prepare('SELECT * FROM google_auth ORDER BY id DESC LIMIT 1').first();
}

async function saveAuth(env, { accessToken, refreshToken, expiresAt, scope }) {
  const existing = await getStoredAuth(env);

  if (existing) {
    const updates = ['access_token = ?', 'expires_at = ?', "updated_at = datetime('now')"];
    const values = [accessToken, expiresAt];
    if (refreshToken) { updates.push('refresh_token = ?'); values.push(refreshToken); }
    if (scope) { updates.push('scope = ?'); values.push(scope); }
    values.push(existing.id);
    await env.DB.prepare('UPDATE google_auth SET ' + updates.join(', ') + ' WHERE id = ?').bind(...values).run();
    return;
  }

  if (!refreshToken) {
    throw new Error('No refresh token returned by Google - try reconnecting with prompt=consent.');
  }
  await env.DB.prepare(
    'INSERT INTO google_auth (access_token, refresh_token, expires_at, scope) VALUES (?, ?, ?, ?)'
  ).bind(accessToken, refreshToken, expiresAt, scope || null).run();
}

async function refreshAccessToken(env, refreshToken) {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(function () { return ''; });
    throw new Error('Google token refresh failed: ' + resp.status + ' ' + detail);
  }

  const data = await resp.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000 - 60000).toISOString();
  await saveAuth(env, { accessToken: data.access_token, refreshToken: null, expiresAt: expiresAt, scope: data.scope });
  return data.access_token;
}

export async function getValidAccessToken(env) {
  if (!env.DB || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const auth = await getStoredAuth(env);
  if (!auth) return null;

  const expiresAt = new Date(auth.expires_at).getTime();
  if (auth.access_token && expiresAt > Date.now()) {
    return auth.access_token;
  }
  return refreshAccessToken(env, auth.refresh_token);
}

export async function exchangeCodeForTokens(env, code, redirectUri) {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(function () { return ''; });
    throw new Error('Google token exchange failed: ' + resp.status + ' ' + detail);
  }

  const data = await resp.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000 - 60000).toISOString();
  await saveAuth(env, { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: expiresAt, scope: data.scope });
}

export async function isConnected(env) {
  if (!env.DB) return false;
  const auth = await getStoredAuth(env);
  return !!auth;
}

export async function disconnect(env) {
  if (!env.DB) return;
  await env.DB.prepare('DELETE FROM google_auth').run();
}
