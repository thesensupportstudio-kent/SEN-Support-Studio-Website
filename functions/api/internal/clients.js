export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  try {
    let result;
    if (q) {
      const like = '%' + q + '%';
      result = await env.DB.prepare(
        'SELECT id, parent_name, parent_email, parent_phone, child_name, school, status, created_at, updated_at FROM clients ' +
        'WHERE parent_name LIKE ? OR parent_email LIKE ? OR child_name LIKE ? OR school LIKE ? ' +
        'ORDER BY updated_at DESC'
      ).bind(like, like, like, like).all();
    } else {
      result = await env.DB.prepare(
        'SELECT id, parent_name, parent_email, parent_phone, child_name, school, status, created_at, updated_at FROM clients ' +
        'ORDER BY updated_at DESC'
      ).all();
    }

    return new Response(JSON.stringify({ clients: result.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/clients: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not load clients.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
