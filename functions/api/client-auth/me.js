import { requireClientSession } from '../_lib/clientAuth.js';
import { getPacksForClient, getBookingsForClient } from '../_lib/packs.js';

// Only the interaction types that represent something the client themselves
// filled in or received - internal-only bookkeeping types (contact_enquiry,
// links_sent) aren't shown back to them.
const FORM_TYPES = ['sensory_questionnaire', 'tuition_intake', 'client_agreement'];
const REPORT_TYPES = ['session_report'];
const PAYMENT_TYPES = ['invoice_sent'];

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'This isn’t available yet - please get in touch instead.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await requireClientSession(request, env);
    if (!client) {
      return new Response(JSON.stringify({ error: 'Not logged in.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const interactionResult = await env.DB.prepare(
      'SELECT id, type, summary, detail, file_key, due_date, paid_at, viewed_at, created_at FROM interactions WHERE client_id = ? ORDER BY created_at DESC'
    ).bind(client.id).all();
    const interactions = interactionResult.results || [];

    const packs = await getPacksForClient(env, client.id);
    const bookings = await getBookingsForClient(env, client.id, { upcomingOnly: true });

    return new Response(JSON.stringify({
      ok: true,
      parentName: client.parent_name,
      childName: client.child_name,
      email: client.parent_email,
      packs: packs,
      bookings: bookings,
      forms: interactions.filter(function (i) { return FORM_TYPES.indexOf(i.type) !== -1; }),
      reports: interactions.filter(function (i) { return REPORT_TYPES.indexOf(i.type) !== -1; }),
      payments: interactions.filter(function (i) { return PAYMENT_TYPES.indexOf(i.type) !== -1; })
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/me: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
