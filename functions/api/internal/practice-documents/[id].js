import { deletePracticeDocument } from '../../_lib/practiceDocuments.js';

export async function onRequestDelete(context) {
  const { env, params } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing document id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const doc = await deletePracticeDocument(env, id);
    if (doc.file_key && env.FILES) {
      await env.FILES.delete(doc.file_key).catch(function () {});
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/practice-documents/[id] DELETE: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not delete this document.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
