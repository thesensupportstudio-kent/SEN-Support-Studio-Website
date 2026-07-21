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

  const serviceSlug = (body.serviceSlug || '').toString().trim();
  const type = (body.type || '').toString().trim();

  const service = SERVICE_CATALOG[serviceSlug];
  const tier = service && service[type];
  if (!service || !tier) {
    return new Response(JSON.stringify({ error: 'Unknown service or option selected.' }), {
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

    const origin = new URL(request.url).origin;
    const sessions = type === 'pack' ? tier.sessions : 1;

    const session = await createCheckoutSession(env, {
      customerEmail: client.parent_email,
      customerName: client.parent_name,
      lineItemName: service.label + ' - ' + tier.label,
      lineItemDescription: client.child_name ? 'For ' + client.child_name : undefined,
      unitAmount: tier.amount,
      successUrl: origin + '/client-portal.html?checkout=success',
      cancelUrl: origin + '/client-portal.html?checkout=cancelled',
      metadata: {
        // Every Stripe-paid purchase grants exactly the sessions paid for
        // (1 for a single session, N for a pack) - always a fixed pack.
        // 'ongoing' (unlimited, pay-per-session) stays a staff-only
        // arrangement set up directly on a client's profile, not something
        // this checkout flow creates.
        clientId: String(client.id),
        serviceSlug: serviceSlug,
        serviceLabel: service.label,
        packType: 'fixed',
        sessions: String(sessions),
        sessionMinutes: String(service.sessionMinutes)
      }
    });

    return new Response(JSON.stringify({ ok: true, url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/create-checkout-session: ' + String(err && err.message));
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    return new Response(JSON.stringify({ error: err.message || 'Could not start checkout.', detail: err.detail }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
