import { requireClientSession } from '../_lib/clientAuth.js';

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

  const interactionId = (body.interactionId || '').toString().trim();
  if (!interactionId) {
    return new Response(JSON.stringify({ error: 'Missing report id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await requireClientSession(request, env);
    if (!client) {
      return new Response(JSON.stringify({ error: 'Not logged in.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const report = await env.DB.prepare(
      "SELECT id FROM interactions WHERE id = ? AND client_id = ? AND type = 'session_report'"
    ).bind(interactionId, client.id).first();
    if (!report) {
      return new Response(JSON.stringify({ error: 'Report not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(
      "UPDATE interactions SET viewed_at = COALESCE(viewed_at, datetime('now')) WHERE id = ?"
    ).bind(interactionId).run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/mark-report-viewed: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
