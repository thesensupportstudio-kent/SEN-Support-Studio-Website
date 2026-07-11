const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Invoice from SEN Support Studio</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">' + nl2br(data.message || 'Please find your invoice attached.') + '</p>' +
        (data.paymentInstructions ? '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">' + nl2br(data.paymentInstructions) + '</p>' : '') +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0;">If you have any questions about this invoice, simply reply to this email.</p>' +
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

  const recipientName = (body.recipientName || '').trim();
  const recipientEmail = (body.recipientEmail || '').trim();
  const ccEmail = (body.ccEmail || '').trim();
  const subject = (body.subject || 'Invoice from SEN Support Studio').trim();
  const fileName = (body.fileName || 'invoice.pdf').trim();
  const fileBase64 = body.fileBase64 || '';

  if (!recipientName || !recipientEmail || !fileBase64) {
    return new Response(JSON.stringify({ error: 'Please fill in the required fields and attach a PDF.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!EMAIL_RE.test(recipientEmail) || (ccEmail && !EMAIL_RE.test(ccEmail))) {
    return new Response(JSON.stringify({ error: 'Please check the email address(es) entered.' }), {
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

  const to = [recipientEmail];
  if (ccEmail) to.push(ccEmail);

  const emailPayload = {
    from: env.INVOICE_FROM_EMAIL || 'SEN Support Studio Invoices <invoices@sensupportstudio.com>',
    to: to,
    bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
    subject: subject,
    html: buildEmailHtml(body),
    attachments: [{ filename: fileName, content: fileBase64 }]
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
      return new Response(JSON.stringify({ error: 'Resend could not send the invoice.', detail: detail }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in send-invoice: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
