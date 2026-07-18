import { addClientDocument } from '../_lib/clients.js';

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_CONTENT_TYPES = {
  'application/pdf': true,
  'image/jpeg': true,
  'image/png': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true
};
const CATEGORIES = ['EHCP', 'Assessment', 'School letter', 'Other'];

function safeFileName(str) {
  return String(str).replace(/[^a-z0-9.]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.FILES) {
    return new Response(JSON.stringify({ error: 'File storage is not configured yet.' }), {
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
  const label = (body.label || '').trim();
  const category = CATEGORIES.indexOf(body.category) !== -1 ? body.category : 'Other';
  const fileName = (body.fileName || 'document').trim();
  const fileBase64 = body.fileBase64 || '';
  const contentType = (body.contentType || '').trim();

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!label || !fileBase64) {
    return new Response(JSON.stringify({ error: 'Please give the document a label and choose a file.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!ALLOWED_CONTENT_TYPES[contentType]) {
    return new Response(JSON.stringify({ error: 'That file type is not supported. Please use PDF, Word, JPG or PNG.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Rough size check on the base64 payload (4/3 the size of the raw bytes).
  if (fileBase64.length > MAX_FILE_BYTES * 1.4) {
    return new Response(JSON.stringify({ error: 'That file is too large (max 8MB).' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const fileKey = 'documents/' + Date.now() + '-' + safeFileName(fileName);
    await env.FILES.put(fileKey, base64ToBytes(fileBase64), { httpMetadata: { contentType: contentType } });

    await addClientDocument(env, { clientId: clientId, label: label, category: category, fileKey: fileKey });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/upload-document: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not upload this document.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
