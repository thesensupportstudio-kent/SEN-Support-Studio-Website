import { requireClientSession } from '../_lib/clientAuth.js';
import { createCheckoutSession } from '../_lib/stripe.js';
import { SERVICE_CATALOG } from '../_lib/serviceCatalog.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'This isn’t available yet - please get in touch instead.' }), {
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

  const interactionId = (body.interactionId || '').toString().trim();
  if (!interactionId) {
    return new Response(JSON.stringify({ error: 'Missing invoice id.' }), {
      status: 400,
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

    const interaction = await env.DB.prepare(
      "SELECT * FROM interactions WHERE id = ? AND client_id = ? AND type = 'invoice_sent'"
    ).bind(interactionId, client.id).first();

    if (!interaction) {
      return new Response(JSON.stringify({ error: 'Invoice not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (interaction.paid_at) {
      return new Response(JSON.stringify({ error: 'This invoice has already been paid.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let detail = {};
    try { detail = JSON.parse(interaction.detail || '{}'); } catch (e) {}

    const service = detail.serviceKey ? SERVICE_CATALOG[detail.serviceKey] : null;
    if (!service) {
      return new Response(JSON.stringify({ error: 'This invoice can’t be paid online - please get in touch instead.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const origin = new URL(request.url).origin;

    const session = await createCheckoutSession(env, {
      customerEmail: client.parent_email,
      customerName: client.parent_name,
      lineItemName: service.label + ' - ' + interaction.summary,
      lineItemDescription: client.child_name ? 'For ' + client.child_name : undefined,
      unitAmount: service.single.amount,
      successUrl: origin + '/client-portal.html?checkout=success',
      cancelUrl: origin + '/client-portal.html?checkout=cancelled',
      metadata: {
        purpose: 'invoice_payment',
        clientId: String(client.id),
        interactionId: String(interaction.id)
      }
    });

    return new Response(JSON.stringify({ ok: true, url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/pay-invoice: ' + String(err && err.message));
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    return new Response(JSON.stringify({ error: err.message || 'Could not start checkout.', detail: err.detail }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
