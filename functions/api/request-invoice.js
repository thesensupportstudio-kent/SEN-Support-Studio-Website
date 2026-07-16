const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(data) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">New invoice request</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Service:</strong> ' + escapeHtml(data.serviceLabel || data.service || 'Not specified') + '</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Price:</strong> ' + escapeHtml(data.servicePrice || '—') + '</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>School:</strong> ' + escapeHtml(data.schoolName) + '</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Contact:</strong> ' + escapeHtml(data.contactName) + ' &lt;' + escapeHtml(data.contactEmail) + '&gt;</p>' +
        (data.poNumber ? '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>PO number:</strong> ' + escapeHtml(data.poNumber) + '</p>' : '') +
        (data.notes ? '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 8px;"><strong>Notes:</strong> ' + escapeHtml(data.notes) + '</p>' : '') +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:20px 0 0;">Reply directly to this email to respond to ' + escapeHtml(data.contactName) + '.</p>' +
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

  const schoolName = (body.schoolName || '').trim();
  const contactName = (body.contactName || '').trim();
  const contactEmail = (body.contactEmail || '').trim();

  if (!schoolName || !contactName || !contactEmail) {
    return new Response(JSON.stringify({ error: 'Please fill in the required fields.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!EMAIL_RE.test(contactEmail)) {
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

  const notifyTo = env.INVOICE_NOTIFY_EMAIL || 'invoices@sensupportstudio.com';

  const emailPayload = {
    from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
    to: [notifyTo],
    reply_to: contactEmail,
    subject: 'Invoice request — ' + schoolName,
    html: buildEmailHtml(body)
  };

  try {
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

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in request-invoice: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
