import { requireClientSession } from '../_lib/clientAuth.js';
import { getPracticeItemsForClient } from '../_lib/practiceItems.js';
import { getPracticeDocumentsForClient } from '../_lib/practiceDocuments.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'This isn’t available yet - please get in touch instead.' }), {
      status: 503,
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

    const items = await getPracticeItemsForClient(env, client.id);
    const documents = await getPracticeDocumentsForClient(env, client.id);
    return new Response(JSON.stringify({ ok: true, items: items, documents: documents }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/practice: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not load your practice words.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
