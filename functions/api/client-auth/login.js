import { verifyPassword } from '../_lib/passwords.js';
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

  const email = (body.email || '').toString().trim().toLowerCase();
  const password = (body.password || '').toString();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Please enter your email and password.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await env.DB.prepare('SELECT * FROM clients WHERE parent_email = ?').bind(email).first();

    // Same generic message whether the email doesn't exist or the password
    // is wrong, so a login attempt can't be used to find out which emails
    // have an account.
    const invalidMsg = 'Email or password not recognised.';

    if (!client || !client.password_hash) {
      return new Response(JSON.stringify({ error: invalidMsg }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const valid = await verifyPassword(password, client.password_hash, client.password_salt);
    if (!valid) {
      return new Response(JSON.stringify({ error: invalidMsg }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await createClientSession(env, client.id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookieHeader(session.token, session.maxAge)
      }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/login: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
