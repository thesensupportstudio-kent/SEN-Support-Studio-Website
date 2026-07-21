import { requireClientSession } from '../_lib/clientAuth.js';
import { logInteraction } from '../_lib/clients.js';
import { SERVICE_CATALOG } from '../_lib/serviceCatalog.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(pence) {
  return '£' + (pence / 100).toFixed(2).replace(/\.00$/, '');
}

function buildEmailHtml(client, service, tier) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Invoice request from the client portal</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Service:</strong> ' + escapeHtml(service.label + ' - ' + tier.label) + '</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Price:</strong> ' + escapeHtml(formatAmount(tier.amount)) + '</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>School:</strong> ' + escapeHtml(client.school || client.parent_name || '-') + '</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Contact:</strong> ' + escapeHtml(client.parent_name || '') + ' &lt;' + escapeHtml(client.parent_email) + '&gt;</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:20px 0 0;">This came from their existing portal account, so their details are already on file - reply to this email or go to their client profile to send the invoice.</p>' +
      '</div>' +
    '</div>'
  );
}

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

  if (!env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email sending is not configured yet.' }), {
      status: 500,
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

    const notifyTo = env.INVOICE_NOTIFY_EMAIL || 'invoices@sensupportstudio.com';

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
        to: [notifyTo],
        reply_to: client.parent_email,
        subject: 'Invoice request - ' + (client.school || client.parent_name || client.parent_email),
        html: buildEmailHtml(client, service, tier)
      })
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(function () { return ''; });
      console.log('Resend rejected client-auth/request-invoice: ' + resendResp.status + ' ' + detail);
      return new Response(JSON.stringify({ error: 'Could not send this request.', detail: detail }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await logInteraction(env, {
      clientId: client.id,
      type: 'invoice_request',
      summary: 'Invoice requested via portal for ' + service.label + ' - ' + tier.label,
      detail: { serviceLabel: service.label, tierLabel: tier.label, amount: tier.amount }
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in client-auth/request-invoice: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not send this request.', detail: err.detail }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
