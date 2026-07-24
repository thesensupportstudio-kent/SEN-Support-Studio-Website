const VALID_STATUSES = ['enquiry', 'active', 'inactive', 'lapsed'];

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

  const id = (body.id || '').toString().trim();
  const status = (body.status || '').trim();
  const notes = typeof body.notes === 'string' ? body.notes : null;
  const earlyBookingOk = typeof body.earlyBookingOk === 'boolean' ? body.earlyBookingOk : null;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const updates = ["updated_at = datetime('now')"];
  const values = [];
  if (status) { updates.push('status = ?'); values.push(status); }
  if (notes !== null) { updates.push('notes = ?'); values.push(notes); }
  if (earlyBookingOk !== null) { updates.push('early_booking_ok = ?'); values.push(earlyBookingOk ? 1 : 0); }

  if (!status && notes === null && earlyBookingOk === null) {
    return new Response(JSON.stringify({ error: 'Nothing to update.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  values.push(id);

  try {
    await env.DB.prepare('UPDATE clients SET ' + updates.join(', ') + ' WHERE id = ?').bind(...values).run();
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/update-client: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not update client.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
