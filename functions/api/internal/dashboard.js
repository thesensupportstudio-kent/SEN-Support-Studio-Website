// Types of interaction that represent an inbound form submission from a
// parent/carer or school, as opposed to something staff sent out.
const INBOUND_TYPES = ['contact_enquiry', 'tuition_intake', 'client_agreement', 'sensory_questionnaire', 'invoice_request'];

const TYPE_LABELS = {
  contact_enquiry: 'Contact enquiry',
  tuition_intake: 'Tuition intake form',
  client_agreement: 'Client agreement',
  sensory_questionnaire: 'Sensory questionnaire',
  invoice_request: 'Invoice request'
};

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const state = await env.DB.prepare('SELECT last_viewed_at FROM dashboard_state WHERE id = 1').first();

    if (!state) {
      await env.DB.prepare(
        "INSERT INTO dashboard_state (id, last_viewed_at) VALUES (1, datetime('now'))"
      ).run();
      return new Response(JSON.stringify({ newSubmissions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const placeholders = INBOUND_TYPES.map(function () { return '?'; }).join(', ');
    const { results } = await env.DB.prepare(
      'SELECT i.id, i.type, i.summary, i.created_at, c.id AS client_id, c.child_name, c.parent_name ' +
      'FROM interactions i LEFT JOIN clients c ON c.id = i.client_id ' +
      'WHERE i.type IN (' + placeholders + ') AND i.created_at > ? ' +
      'ORDER BY i.created_at DESC LIMIT 20'
    ).bind(...INBOUND_TYPES, state.last_viewed_at).all();

    await env.DB.prepare("UPDATE dashboard_state SET last_viewed_at = datetime('now') WHERE id = 1").run();

    const newSubmissions = (results || []).map(function (row) {
      return {
        id: row.id,
        type: row.type,
        label: TYPE_LABELS[row.type] || row.type,
        summary: row.summary,
        clientId: row.client_id,
        childName: row.child_name,
        parentName: row.parent_name,
        createdAt: row.created_at
      };
    });

    return new Response(JSON.stringify({ newSubmissions: newSubmissions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/dashboard: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not load dashboard summary.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
