import { logInteraction } from '../_lib/clients.js';
import { sendAccountSetupEmail } from '../_lib/accountSetupEmail.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
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

  const clientId = (body.clientId || '').toString().trim();
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first();
    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!client.parent_email) {
      return new Response(JSON.stringify({ error: 'This client has no email address on file.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await sendAccountSetupEmail(env, request, client);

    await logInteraction(env, {
      clientId: clientId,
      type: 'portal_access_enabled',
      summary: 'Sent account setup email'
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/enable-portal-access: ' + String(err && err.message));
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 400;
    return new Response(JSON.stringify({ error: err.message || 'Could not send this email.', detail: err.detail }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
