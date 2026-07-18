import { buildReportPdf, buildChildPagesPdf, bytesToBase64 } from './_lib/pdf.js';
import { logInteraction } from './_lib/clients.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso;
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function safeFileName(str) {
  return String(str).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function buildEmailHtml(data) {
  const greeting = data.recipientName ? '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">Dear ' + escapeHtml(data.recipientName) + ',</p>' : '';
  const perChildNote = data.perChild
    ? '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">Each pupil has their own page in the attached PDF, ready to save into their individual file.</p>'
    : '';
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Thank you for booking your ' + escapeHtml(data.service) + '</h1>' +
        greeting +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">Thank you for booking your ' + escapeHtml(data.service.toLowerCase()) + ' with SEN Support Studio. Please find your full report from the ' + escapeHtml(formatDate(data.sessionDate)) + ' session attached as a PDF.</p>' +
        perChildNote +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 16px;">We hope it offers useful insight, and we look forward to continuing to build strong roots and space to flourish, together.</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">If you have any questions about this report, simply reply to this email.</p>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0;">Warm wishes,<br>SEN Support Studio</p>' +
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
    const clientName = (body.clientName || '').trim();
    const clientEmail = (body.clientEmail || '').trim();
    const ccEmail = (body.ccEmail || '').trim();
    const sessionDate = (body.sessionDate || '').trim();
    const title = (body.title || 'Session Report').trim();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const childPages = Array.isArray(body.childPages) ? body.childPages : [];
    const service = (body.service || 'Session').trim();
    const recipientName = (body.recipientName || clientName).trim();
    const clientLabel = (body.clientLabel || 'Client').trim();

    if (!clientName || !clientEmail || !sessionDate || (sections.length === 0 && childPages.length === 0)) {
      return new Response(JSON.stringify({ error: 'Please fill in the required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!EMAIL_RE.test(clientEmail) || (ccEmail && !EMAIL_RE.test(ccEmail))) {
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

    const to = [clientEmail];
    if (ccEmail) to.push(ccEmail);

    const isPerChild = childPages.length > 0;
    const pdfBytes = isPerChild
      ? await buildChildPagesPdf({ title, clientName, clientLabel, sessionDate, childPages })
      : await buildReportPdf({ title, clientName, clientLabel, sessionDate, sections });
    const pdfBase64 = bytesToBase64(pdfBytes);
    const pdfFileName = safeFileName(title + '-' + clientName) + '.pdf';

    let fileKey = null;
    if (env.FILES) {
      try {
        fileKey = 'reports/' + Date.now() + '-' + pdfFileName;
        await env.FILES.put(fileKey, pdfBytes, { httpMetadata: { contentType: 'application/pdf' } });
      } catch (err) {
        console.log('R2 upload failed in send-report: ' + String(err && err.message));
        fileKey = null;
      }
    }

    const emailPayload = {
      from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
      to: to,
      bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
      subject: title + ' - ' + clientName + ' - ' + sessionDate,
      html: buildEmailHtml({ service, recipientName, sessionDate, perChild: isPerChild }),
      attachments: [{ filename: pdfFileName, content: pdfBase64 }]
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
      // Stay in the 4xx range - Cloudflare swaps a generic branded page in
      // for any 5xx response, which would hide the real reason from the UI.
      return new Response(JSON.stringify({ error: 'Resend could not send the email.', detail: detail }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await logInteraction(env, {
      clientId: body.clientId || null,
      parentName: recipientName,
      parentEmail: clientEmail,
      childName: isPerChild ? null : clientName,
      type: 'session_report',
      summary: title + ' sent for ' + clientName + ' (' + sessionDate + ')',
      detail: { title, service, sessionDate, clientLabel },
      status: 'active',
      fileKey: fileKey
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in send-report: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
