import { getPracticeDocumentsForClient, createPracticeDocument } from '../_lib/practiceDocuments.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB - a scanned/printed flashcard sheet

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
    const documents = await getPracticeDocumentsForClient(env, clientId);
    return new Response(JSON.stringify({ documents: documents }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/practice-documents GET: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not load flashcard PDFs.' }), {
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
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const fileBase64 = body.fileBase64 || '';
  const contentType = (body.fileContentType || '').trim();
  if (!fileBase64) {
    return new Response(JSON.stringify({ error: 'Please choose a PDF to upload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (contentType !== 'application/pdf') {
    return new Response(JSON.stringify({ error: 'Please upload a PDF file.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (fileBase64.length > MAX_FILE_BYTES * 1.4) {
    return new Response(JSON.stringify({ error: 'That PDF is too large (max 10MB).' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const fileName = safeFileName(body.fileName || 'flashcards.pdf') || 'flashcards.pdf';
  const fileKey = 'practice-pdfs/' + clientId + '/' + Date.now() + '-' + fileName;
  await env.FILES.put(fileKey, base64ToBytes(fileBase64), { httpMetadata: { contentType: contentType } });

  try {
    const id = await createPracticeDocument(env, {
      clientId: clientId,
      fileName: body.fileName || fileName,
      fileKey: fileKey
    });
    return new Response(JSON.stringify({ ok: true, id: id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/practice-documents POST: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not upload this PDF.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
