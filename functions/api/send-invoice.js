import { logInteraction } from './_lib/clients.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Update this if the business bank details ever change - it's the
// only thing that needs to change to put them on every future invoice.
const BANK_DETAILS = 'Account name: SEN Support Studio LTD\nAccount number: 32734135\nSort code: 04-06-05';

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

function safeFileName(str) {
  return String(str).replace(/[^a-z0-9.]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function buildPaymentBlock() {
  if (BANK_DETAILS) {
    return 'Bank transfer details:<br>' + nl2br(BANK_DETAILS);
  }
  return 'Bank transfer details will follow separately - in the meantime, please don’t hesitate to get in touch with any questions.';
}

function buildEmailHtml(data) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Invoice from SEN Support Studio</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">Thank you for booking in with SEN Support Studio. Please find your invoice attached, along with our bank details for payment below.</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">' + buildPaymentBlock() + '</p>' +
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
  const service = (body.service || '').trim();
  const fileName = (body.fileName || 'invoice.pdf').trim();
  const fileBase64 = body.fileBase64 || '';

  if (!recipientName || !recipientEmail || !service || !fileBase64) {
    return new Response(JSON.stringify({ error: 'Please fill in the required fields and attach a PDF.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!EMAIL_RE.test(recipientEmail)) {
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

  let fileKey = null;
  if (env.FILES) {
    try {
      fileKey = 'invoices/' + Date.now() + '-' + safeFileName(fileName);
      await env.FILES.put(fileKey, base64ToBytes(fileBase64), { httpMetadata: { contentType: 'application/pdf' } });
    } catch (err) {
      console.log('R2 upload failed in send-invoice: ' + String(err && err.message));
      fileKey = null;
    }
  }

  const emailPayload = {
    from: env.INVOICE_FROM_EMAIL || 'SEN Support Studio Invoices <invoices@sensupportstudio.com>',
    to: [recipientEmail],
    bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
    subject: 'Invoice - ' + service,
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

    await logInteraction(env, {
      clientId: body.clientId || null,
      parentName: recipientName,
      parentEmail: recipientEmail,
      type: 'invoice_sent',
      summary: 'Invoice sent for ' + service,
      detail: { service, fileName },
      status: 'active',
      fileKey: fileKey
    });

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
