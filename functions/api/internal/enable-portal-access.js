import { logInteraction } from '../_lib/clients.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(parentName, setupUrl) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Set up your account</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(parentName || 'there') + ', you can now log in any time to book sessions, see your remaining sessions, and view forms and reports we’ve shared with you. Set your password to get started.</p>' +
        '<a href="' + setupUrl + '" style="display:inline-block;background:#2D5439;color:#F8F1DE;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;">Set up my account &rarr;</a>' +
        '<p style="font-size:13px;color:#5b6f5f;margin:20px 0 0;">This link expires in 24 hours. If you have any questions, just reply to this email.</p>' +
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
    if (!client.parent_email) {
      return new Response(JSON.stringify({ error: 'This client has no email address on file.' }), {
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

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 3600000).toISOString();
    await env.DB.prepare(
      "INSERT INTO client_password_tokens (client_id, token, purpose, expires_at) VALUES (?, ?, 'setup', ?)"
    ).bind(clientId, token, expiresAt).run();

    const origin = new URL(request.url).origin;
    const setupUrl = origin + '/client-set-password.html?token=' + token;

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
        subject: 'Set up your account - SEN Support Studio',
        html: buildEmailHtml(client.parent_name, setupUrl)
      })
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(function () { return ''; });
      console.log('Resend rejected portal-access email: ' + resendResp.status + ' ' + detail);
      return new Response(JSON.stringify({ error: 'Could not send the account setup email.', detail: detail }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await logInteraction(env, {
      clientId: clientId,
      type: 'portal_access_enabled',
      summary: 'Sent account setup email'
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/enable-portal-access: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not send this email.', detail: String(err && err.message) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
