import { requireClientSession } from '../_lib/clientAuth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.FILES || !env.DB) {
    return new Response('This isn’t available yet.', { status: 503 });
  }

  const client = await requireClientSession(request, env);
  if (!client) {
    return new Response('Not logged in.', { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  const isReport = /^reports\/[A-Za-z0-9._-]+$/.test(key);
  const isPracticeImage = /^practice-images\/[0-9]+\/[A-Za-z0-9._-]+$/.test(key);
  if (!isReport && !isPracticeImage) {
    return new Response('Invalid file key.', { status: 400 });
  }

  // Only serve a file this client's own record actually has - stops a
  // logged-in client from reading another family's file by guessing keys.
  const owns = isReport
    ? await env.DB.prepare(
      "SELECT id FROM interactions WHERE client_id = ? AND file_key = ? AND type = 'session_report'"
    ).bind(client.id, key).first()
    : await env.DB.prepare(
      'SELECT id FROM practice_items WHERE client_id = ? AND image_key = ?'
    ).bind(client.id, key).first();
  if (!owns) {
    return new Response('File not found.', { status: 404 });
  }

  const object = await env.FILES.get(key);
  if (!object) {
    return new Response('File not found.', { status: 404 });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': (object.httpMetadata && object.httpMetadata.contentType) || 'application/pdf',
      'Content-Disposition': 'inline; filename="' + key.split('/').pop() + '"'
    }
  });
}
