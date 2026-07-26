import { buildReceiptPdf, bytesToBase64 } from '../_lib/pdf.js';
import { logInteraction } from '../_lib/clients.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFileName(str) {
  return String(str).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso;
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatAmount(pounds) {
  return '£' + pounds.toFixed(2).replace(/\.00$/, '');
}

function buildReceiptNumber(dateReceived) {
  const datePart = /^\d{4}-\d{2}-\d{2}$/.test(dateReceived) ? dateReceived.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return 'RCT-' + datePart + '-' + String(Date.now()).slice(-4);
}

function buildEmailHtml(data) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Thank you for your payment</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">Hi ' + escapeHtml(data.recipientName) + ', this confirms we’ve received your payment. Please find your receipt attached as a PDF.</p>' +
        '<div style="background:#FBFAF5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">' +
          '<p style="font-size:14px;color:#5b6f5f;margin:0 0 4px;">' + escapeHtml(data.description) + '</p>' +
          '<p style="font-size:16px;font-weight:700;color:#2D5439;margin:0;">' + escapeHtml(formatAmount(data.amount)) + '</p>' +
        '</div>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0;">If you have any questions, simply reply to this email.</p>' +
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
    const recipientName = (body.recipientName || '').trim();
    const recipientEmail = (body.recipientEmail || '').trim();
    const description = (body.description || '').trim();
    const amount = parseFloat(body.amount);
    const dateReceived = (body.dateReceived || '').trim();
    const paymentMethod = (body.paymentMethod || '').trim();
    const notes = (body.notes || '').trim();

    if (!recipientName || !recipientEmail || !description || !amount || amount <= 0 || !dateReceived) {
      return new Response(JSON.stringify({ error: 'Please fill in the required fields.' }), {
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

    const receiptNumber = buildReceiptNumber(dateReceived);

    const pdfBytes = await buildReceiptPdf({
      clientName: recipientName,
      description: description,
      amountLabel: formatAmount(amount),
      dateLabel: formatDate(dateReceived),
      paymentMethod: paymentMethod,
      notes: notes,
      receiptNumber: receiptNumber
    });
    const pdfBase64 = bytesToBase64(pdfBytes);
    const pdfFileName = safeFileName('Receipt-' + receiptNumber) + '.pdf';

    let fileKey = null;
    if (env.FILES) {
      try {
        fileKey = 'receipts/' + Date.now() + '-' + pdfFileName;
        await env.FILES.put(fileKey, pdfBytes, { httpMetadata: { contentType: 'application/pdf' } });
      } catch (err) {
        console.log('R2 upload failed in send-receipt: ' + String(err && err.message));
        fileKey = null;
      }
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RECEIPT_FROM_EMAIL || 'SEN Support Studio <bookings@sensupportstudio.com>',
        to: [recipientEmail],
        subject: 'Payment Receipt - SEN Support Studio',
        html: buildEmailHtml({ recipientName, description, amount }),
        attachments: [{ filename: pdfFileName, content: pdfBase64 }]
      })
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(function () { return ''; });
      console.log('Resend rejected send-receipt: ' + resendResp.status + ' ' + detail);
      return new Response(JSON.stringify({ error: 'Could not send this receipt.', detail: detail }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await logInteraction(env, {
      clientId: body.clientId || null,
      parentName: recipientName,
      parentEmail: recipientEmail,
      type: 'receipt_sent',
      summary: 'Receipt sent for ' + formatAmount(amount) + ' - ' + description,
      detail: { receiptNumber, description, amount, dateReceived, paymentMethod, notes },
      status: 'active',
      fileKey: fileKey
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in send-receipt: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
