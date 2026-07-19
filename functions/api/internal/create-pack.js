import { logInteraction } from '../_lib/clients.js';
import { createPack, ensurePortalToken } from '../_lib/packs.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(parentName, serviceLabel, totalSessions, portalUrl) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Your sessions are ready to book</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(parentName || 'there') + ', your ' + escapeHtml(String(totalSessions)) + '-session ' + escapeHtml(serviceLabel) + ' pack is set up. Use the link below any time to see how many sessions you have left, book your next one, or manage an existing booking.</p>' +
        '<a href="' + portalUrl + '" style="display:inline-block;background:#2D5439;color:#F8F1DE;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;">Manage my bookings &rarr;</a>' +
        '<p style="font-size:13px;color:#5b6f5f;margin:20px 0 0;">Keep this link handy - it always shows your current sessions. If you have any questions, just reply to this email.</p>' +
      '</div>' +
    '</div>'
  );
}

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

  const clientId = (body.clientId || '').toString().trim();
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first();
    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const packId = await createPack(env, {
      clientId: clientId,
      serviceLabel: body.serviceLabel,
      totalSessions: body.totalSessions,
      sessionMinutes: body.sessionMinutes
    });

    const portalToken = await ensurePortalToken(env, clientId);
    const origin = new URL(request.url).origin;
    const portalUrl = origin + '/my-bookings.html?token=' + portalToken;

    await logInteraction(env, {
      clientId: clientId,
      type: 'pack_created',
      summary: 'Added ' + body.totalSessions + '-session pack: ' + body.serviceLabel,
      detail: { serviceLabel: body.serviceLabel, totalSessions: body.totalSessions, sessionMinutes: body.sessionMinutes || 60 }
    });

    let emailed = false;
    if (env.RESEND_API_KEY && client.parent_email) {
      const emailPayload = {
        from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
        to: [client.parent_email],
        bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
        subject: 'Your sessions are ready to book - SEN Support Studio',
        html: buildEmailHtml(client.parent_name, body.serviceLabel, body.totalSessions, portalUrl)
      };
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });
      emailed = resendResp.ok;
      if (!resendResp.ok) {
        const detail = await resendResp.text().catch(function () { return ''; });
        console.log('Resend rejected pack-created email: ' + resendResp.status + ' ' + detail);
      }
    }

    return new Response(JSON.stringify({ ok: true, packId: packId, portalUrl: portalUrl, emailed: emailed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/create-pack: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not create this pack.', detail: String(err && err.message) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
