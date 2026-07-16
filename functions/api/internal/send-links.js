import { logInteraction } from '../_lib/clients.js';

const FORM_META = {
  client_agreement: { path: 'client-agreement.html', label: 'Client Agreement', desc: 'Onboarding details, consents and policies to agree to.' },
  sensory_questionnaire: { path: 'sensory-questionnaire.html', label: 'Sensory Profile Questionnaire', desc: 'A questionnaire covering each of the senses.' },
  tuition_intake: { path: 'tuition-intake.html', label: 'Getting to Know You', desc: 'Background on your child, their goals, and what helps them.' }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(parentName, links) {
  const rows = links.map(function (link) {
    return (
      '<div style="margin:0 0 16px;">' +
        '<a href="' + link.url + '" style="display:inline-block;background:#2D5439;color:#F8F1DE;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;">' + escapeHtml(link.label) + '</a>' +
        '<p style="font-size:13px;color:#5b6f5f;margin:6px 0 0;">' + escapeHtml(link.desc) + '</p>' +
      '</div>'
    );
  }).join('');

  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">A couple of things to complete</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(parentName || 'there') + ', when you have a moment, please could you complete the following:</p>' +
        rows +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:20px 0 0;">If you have any questions, just reply to this email.</p>' +
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
  const forms = Array.isArray(body.forms) ? body.forms.filter(function (f) { return FORM_META[f]; }) : [];

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing client id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!forms.length) {
    return new Response(JSON.stringify({ error: 'Choose at least one form to send.' }), {
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

    const origin = new URL(request.url).origin;
    const links = forms.map(function (formType) {
      const meta = FORM_META[formType];
      return {
        formType: formType,
        label: meta.label,
        desc: meta.desc,
        token: crypto.randomUUID(),
        url: null
      };
    });
    links.forEach(function (link) { link.url = origin + '/' + FORM_META[link.formType].path + '?token=' + link.token; });

    const emailPayload = {
      from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
      to: [client.parent_email],
      bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
      subject: 'A couple of things to complete — SEN Support Studio',
      html: buildEmailHtml(client.parent_name, links)
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

    for (const link of links) {
      await env.DB.prepare(
        'INSERT INTO assignments (client_id, form_type, token) VALUES (?, ?, ?)'
      ).bind(clientId, link.formType, link.token).run();
    }

    await logInteraction(env, {
      clientId: clientId,
      type: 'links_sent',
      summary: 'Sent links: ' + links.map(function (l) { return l.label; }).join(', '),
      detail: { forms: forms }
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/send-links: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
