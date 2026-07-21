import { verifyStripeSignature } from '../_lib/stripe.js';
import { createPack } from '../_lib/packs.js';
import { logInteraction } from '../_lib/clients.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.log('STRIPE_WEBHOOK_SECRET is not configured - rejecting webhook.');
    return new Response(JSON.stringify({ error: 'Webhook is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('Stripe-Signature');

  const valid = await verifyStripeSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.log('Stripe webhook signature verification failed.');
    return new Response(JSON.stringify({ error: 'Invalid signature.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Stripe guarantees at-least-once delivery - the same event can arrive
  // more than once, so claim the event id first and bail out early (still
  // returning 200, so Stripe doesn't keep retrying) if we've already
  // handled it. If processing then fails, the claim is released so a
  // genuine Stripe retry can try again instead of being silently dropped.
  let claimed = false;
  try {
    const claim = await env.DB.prepare(
      'INSERT OR IGNORE INTO stripe_events (id) VALUES (?)'
    ).bind(event.id).run();
    if (!claim.meta.changes) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    claimed = true;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};

      if (metadata.purpose === 'invoice_payment') {
        if (metadata.interactionId && metadata.clientId) {
          await env.DB.prepare(
            "UPDATE interactions SET paid_at = datetime('now') WHERE id = ? AND client_id = ?"
          ).bind(metadata.interactionId, metadata.clientId).run();
        } else {
          console.log('Stripe checkout.session.completed (invoice_payment) missing interactionId/clientId - skipping.');
        }
      } else {
        const clientId = metadata.clientId;

        if (clientId) {
          const totalSessions = parseInt(metadata.sessions, 10) || 1;
          const sessionMinutes = parseInt(metadata.sessionMinutes, 10) || 60;

          await createPack(env, {
            clientId: clientId,
            serviceLabel: metadata.serviceLabel || 'Session pack',
            totalSessions: totalSessions,
            sessionMinutes: sessionMinutes,
            packType: 'fixed'
          });

          await logInteraction(env, {
            clientId: clientId,
            type: 'pack_created',
            summary: 'Paid & booked ' + totalSessions + '-session pack: ' + (metadata.serviceLabel || 'Session pack') + ' (via Stripe)',
            detail: {
              serviceLabel: metadata.serviceLabel,
              totalSessions: totalSessions,
              sessionMinutes: sessionMinutes,
              packType: 'fixed',
              stripeSessionId: session.id,
              amountPaid: session.amount_total,
              currency: session.currency
            }
          });
        } else {
          console.log('Stripe checkout.session.completed with no clientId in metadata - skipping.');
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in stripe/webhook: ' + String(err && err.message));
    if (claimed) {
      await env.DB.prepare('DELETE FROM stripe_events WHERE id = ?').bind(event.id).run().catch(function () {});
    }
    // Stay in the 4xx range so Cloudflare doesn't mask the real error, but
    // Stripe will still treat this as a delivery failure and retry.
    return new Response(JSON.stringify({ error: 'Could not process this event.', detail: String(err && err.message) }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
