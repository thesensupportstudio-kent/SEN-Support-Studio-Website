export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();

    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const interactionResult = await env.DB.prepare(
      'SELECT id, type, summary, detail, file_key, created_at FROM interactions WHERE client_id = ? ORDER BY created_at DESC'
    ).bind(id).all();

    const assignmentResult = await env.DB.prepare(
      'SELECT id, form_type, status, sent_at, completed_at FROM assignments WHERE client_id = ? ORDER BY sent_at DESC'
    ).bind(id).all();

    return new Response(JSON.stringify({ client, interactions: interactionResult.results, assignments: assignmentResult.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/client: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not load client.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
