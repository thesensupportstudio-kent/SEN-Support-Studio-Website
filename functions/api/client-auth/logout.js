import { getSessionToken, destroyClientSession, clearSessionCookieHeader } from '../_lib/clientAuth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (env.DB) {
    const token = getSessionToken(request);
    if (token) await destroyClientSession(env, token);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookieHeader()
    }
  });
}
