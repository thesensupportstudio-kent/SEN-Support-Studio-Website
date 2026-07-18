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

  const interactionId = Number(body.interactionId);
  if (!interactionId) {
    return new Response(JSON.stringify({ error: 'Missing document id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const row = await env.DB.prepare(
      "SELECT id, file_key FROM interactions WHERE id = ? AND type = 'document_uploaded'"
    ).bind(interactionId).first();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Document not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (row.file_key && env.FILES) {
      try {
        await env.FILES.delete(row.file_key);
      } catch (err) {
        console.log('R2 delete failed in delete-document: ' + String(err && err.message));
      }
    }

    await env.DB.prepare('DELETE FROM interactions WHERE id = ?').bind(interactionId).run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/delete-document: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not delete this document.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
