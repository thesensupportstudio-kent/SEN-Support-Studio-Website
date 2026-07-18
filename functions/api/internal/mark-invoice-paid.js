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
  const paid = body.paid !== false;

  if (!interactionId) {
    return new Response(JSON.stringify({ error: 'Missing invoice id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const row = await env.DB.prepare(
      "SELECT id FROM interactions WHERE id = ? AND type = 'invoice_sent'"
    ).bind(interactionId).first();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Invoice not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(
      "UPDATE interactions SET paid_at = ? WHERE id = ?"
    ).bind(paid ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null, interactionId).run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/mark-invoice-paid: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not update this invoice.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
