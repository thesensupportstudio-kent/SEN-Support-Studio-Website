import { getPracticeItemsForClient, createPracticeItem } from '../_lib/practiceItems.js';

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB - these are small flashcard pictures
const ALLOWED_CONTENT_TYPES = { 'image/jpeg': true, 'image/png': true, 'image/webp': true };

function safeFileName(str) {
  return String(str).replace(/[^a-z0-9.]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const clientId = (url.searchParams.get('clientId') || '').trim();
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const items = await getPracticeItemsForClient(env, clientId);
    return new Response(JSON.stringify({ items: items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/practice-items GET: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not load practice items.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

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

  const clientId = Number(body.clientId);
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let imageKey = null;
  const fileBase64 = body.imageBase64 || '';
  const contentType = (body.imageContentType || '').trim();

  if (fileBase64) {
    if (!env.FILES) {
      return new Response(JSON.stringify({ error: 'Image storage is not configured yet.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!ALLOWED_CONTENT_TYPES[contentType]) {
      return new Response(JSON.stringify({ error: 'That image type is not supported. Please use JPG, PNG or WebP.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (fileBase64.length > MAX_FILE_BYTES * 1.4) {
      return new Response(JSON.stringify({ error: 'That image is too large (max 3MB).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    imageKey = 'practice-images/' + clientId + '/' + Date.now() + '-' + safeFileName(body.imageFileName || 'image');
    await env.FILES.put(imageKey, base64ToBytes(fileBase64), { httpMetadata: { contentType: contentType } });
  }

  try {
    const id = await createPracticeItem(env, {
      clientId: clientId,
      kind: body.kind,
      mainText: body.mainText,
      exampleText: body.exampleText,
      emoji: body.emoji,
      imageKey: imageKey
    });
    return new Response(JSON.stringify({ ok: true, id: id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/practice-items POST: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not add this item.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
