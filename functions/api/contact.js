import { logInteraction } from './_lib/clients.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LABELS = {
  parent: 'Parent / Carer',
  school: 'School / Educator',
  other: 'Other'
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(str) {
  return escapeHtml(str).replace(/\n/g, '<br>');
}

function buildEmailHtml(data) {
  const roleLabel = ROLE_LABELS[data.role] || data.role || 'Not specified';
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">New website enquiry</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>From:</strong> ' + escapeHtml(data.name) + ' &lt;' + escapeHtml(data.email) + '&gt;</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>I am a:</strong> ' + escapeHtml(roleLabel) + '</p>' +
        (data.serviceLabel ? '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Interested in:</strong> ' + escapeHtml(data.serviceLabel) + '</p>' : '') +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:16px 0 4px;"><strong>Message:</strong></p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">' + nl2br(data.message) + '</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0;">Reply directly to this email to respond to ' + escapeHtml(data.name) + '.</p>' +
      '</div>' +
    '</div>'
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const role = (body.role || '').trim();
    const message = (body.message || '').trim();
    const serviceLabel = (body.serviceLabel || '').trim();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Please fill in the required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Please check the email address entered.' }), {
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

    const notifyTo = env.CONTACT_TO_EMAIL || 'hello@sensupportstudio.com';

    const emailPayload = {
      from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
      to: [notifyTo],
      reply_to: email,
      subject: 'Website enquiry from ' + name,
      html: buildEmailHtml({ name, email, role, message, serviceLabel })
    };

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(function () { return ''; });
      console.log('Resend rejected send: ' + resendResp.status + ' ' + detail);
      return new Response(JSON.stringify({ error: 'Resend could not send the email.', detail: detail }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await logInteraction(env, {
      parentName: name,
      parentEmail: email,
      type: 'contact_enquiry',
      summary: serviceLabel
        ? 'Website enquiry - ' + serviceLabel
        : 'Website enquiry (' + (ROLE_LABELS[role] || role || 'not specified') + ')',
      detail: { role, message, serviceLabel: serviceLabel || undefined }
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in contact: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
