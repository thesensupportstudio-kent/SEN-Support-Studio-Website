import { hashPassword } from '../_lib/passwords.js';
import { createClientSession, sessionCookieHeader } from '../_lib/clientAuth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'This isn’t available yet - please get in touch instead.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = (body.token || '').toString().trim();
  const password = (body.password || '').toString();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing or invalid link.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ error: 'Please choose a password of at least 8 characters.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const tokenRow = await env.DB.prepare(
      "SELECT * FROM client_password_tokens WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')"
    ).bind(token).first();

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: 'This link has expired or was already used - request a new one.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { hash, salt } = await hashPassword(password);

    await env.DB.prepare(
      'UPDATE clients SET password_hash = ?, password_salt = ? WHERE id = ?'
    ).bind(hash, salt, tokenRow.client_id).run();

    await env.DB.prepare(
      "UPDATE client_password_tokens SET used_at = datetime('now') WHERE id = ?"
    ).bind(tokenRow.id).run();

    const session = await createClientSession(env, tokenRow.client_id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookieHeader(session.token, session.maxAge)
      }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/set-password: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
