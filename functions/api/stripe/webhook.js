import { verifyStripeSignature } from '../_lib/stripe.js';
import { createPack } from '../_lib/packs.js';
import { logInteraction } from '../_lib/clients.js';

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(pence, currency) {
  const amount = (pence / 100).toFixed(2);
  return (currency || 'gbp').toUpperCase() === 'GBP' ? '£' + amount : amount + ' ' + (currency || '').toUpperCase();
}

function buildReceiptEmailHtml(client, lineLabel, amount, currency) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Thank you for your payment</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(client.parent_name || 'there') + ', this confirms we’ve received your payment.</p>' +
        '<div style="background:#FBFAF5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">' +
          '<p style="font-size:14px;color:#5b6f5f;margin:0 0 4px;">Payment for</p>' +
          '<p style="font-size:16px;font-weight:700;color:#2D5439;margin:0 0 8px;">' + escapeHtml(lineLabel) + '</p>' +
          '<p style="font-size:14px;color:#5b6f5f;margin:0;">Amount paid: <strong style="color:#2D5439;">' + escapeHtml(formatAmount(amount, currency)) + '</strong></p>' +
        '</div>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0;">Log in any time to book your session date/time and see everything in one place.</p>' +
      '</div>' +
    '</div>'
  );
}

async function sendReceiptEmail(env, client, lineLabel, amount, currency) {
  if (!env.RESEND_API_KEY || !client || !client.parent_email) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.BOOKING_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
        to: [client.parent_email],
        subject: 'Payment received - SEN Support Studio',
        html: buildReceiptEmailHtml(client, lineLabel, amount, currency)
      })
    }).then(function (resp) {
      if (!resp.ok) return resp.text().then(function (t) { console.log('Resend rejected payment-receipt email: ' + resp.status + ' ' + t); });
    });
  } catch (err) {
    // A receipt email failing to send shouldn't fail the whole webhook -
    // the payment itself has already been recorded correctly.
    console.log('sendReceiptEmail failed: ' + String(err && err.message));
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

          const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(metadata.clientId).first();
          const interaction = await env.DB.prepare('SELECT summary FROM interactions WHERE id = ?').bind(metadata.interactionId).first();
          await sendReceiptEmail(env, client, (interaction && interaction.summary) || 'Session payment', session.amount_total, session.currency);
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

          const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first();
          const lineLabel = (metadata.serviceLabel || 'Session pack') + (totalSessions > 1 ? ' (' + totalSessions + ' sessions)' : '');
          await sendReceiptEmail(env, client, lineLabel, session.amount_total, session.currency);
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
