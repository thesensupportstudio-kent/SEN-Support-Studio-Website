import { logInteraction } from '../_lib/clients.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(parentName, message) {
  const paragraphs = message.split(/\n{2,}/).map(function (para) {
    return '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">' + escapeHtml(para).replace(/\n/g, '<br>') + '</p>';
  }).join('');

  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(parentName || 'there') + ',</p>' +
        paragraphs +
        '<p style="font-size:13px;color:#5b6f5f;margin:20px 0 0;">Just reply to this email if you have any questions.</p>' +
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
  const subject = (body.subject || '').toString().trim();
  const message = (body.message || '').toString().trim();

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (!subject || !message) {
    return new Response(JSON.stringify({ error: 'Please add a subject and message.' }), {
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

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Personal, one-off emails go out under Emma's own address rather
        // than the generic automated-report sender, so replies land
        // directly with her instead of a shared inbox.
        from: env.PERSONAL_FROM_EMAIL || 'Emma Owen <emma@sensupportstudio.com>',
        to: [client.parent_email],
        bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
        subject: subject,
        html: buildEmailHtml(client.parent_name, message)
      })
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(function () { return ''; });
      console.log('Resend rejected internal/send-email: ' + resendResp.status + ' ' + detail);
      return new Response(JSON.stringify({ error: 'Resend could not send the email.', detail: detail }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await logInteraction(env, {
      clientId: clientId,
      type: 'email_sent',
      summary: subject,
      detail: { message: message }
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/send-email: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
