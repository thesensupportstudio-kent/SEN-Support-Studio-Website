import { logInteraction } from '../_lib/clients.js';
import { createPack } from '../_lib/packs.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(parentName, serviceLabel, loginUrl) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Your sessions are ready to book</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(parentName || 'there') + ', your ' + escapeHtml(serviceLabel) + ' sessions are set up. Log in any time to see how many you have left, book your next one, or manage an existing booking.</p>' +
        '<a href="' + loginUrl + '" style="display:inline-block;background:#2D5439;color:#F8F1DE;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;">Log in to book &rarr;</a>' +
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

    const isOngoing = body.packType === 'ongoing';

    const packId = await createPack(env, {
      clientId: clientId,
      serviceLabel: body.serviceLabel,
      totalSessions: body.totalSessions,
      sessionMinutes: body.sessionMinutes,
      packType: body.packType,
      serviceKey: body.serviceKey
    });

    await logInteraction(env, {
      clientId: clientId,
      type: 'pack_created',
      summary: isOngoing
        ? 'Set up ongoing (pay-per-session) booking: ' + body.serviceLabel
        : 'Added ' + body.totalSessions + '-session pack: ' + body.serviceLabel,
      detail: { serviceLabel: body.serviceLabel, totalSessions: isOngoing ? null : body.totalSessions, sessionMinutes: body.sessionMinutes || 60, packType: isOngoing ? 'ongoing' : 'fixed' }
    });

    // Only clients who already have portal access get an email here - if
    // they don't have an account yet, "Enable portal access" on their
    // profile is the one that sends them a link (to set a password first).
    let emailed = false;
    if (env.RESEND_API_KEY && client.parent_email && client.password_hash) {
      const origin = new URL(request.url).origin;
      const loginUrl = origin + '/client-login.html';
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
          to: [client.parent_email],
          bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
          subject: 'Your sessions are ready to book - SEN Support Studio',
          html: buildEmailHtml(client.parent_name, body.serviceLabel, loginUrl)
        })
      });
      emailed = resendResp.ok;
      if (!resendResp.ok) {
        const detail = await resendResp.text().catch(function () { return ''; });
        console.log('Resend rejected pack-created email: ' + resendResp.status + ' ' + detail);
      }
    }

    return new Response(JSON.stringify({ ok: true, packId: packId, emailed: emailed }), {
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
