const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2p(str) {
  return String(str)
    .split(/\n{2,}/)
    .map(function (para) {
      return '<p style="margin:0 0 10px;">' + escapeHtml(para).replace(/\n/g, '<br>') + '</p>';
    })
    .join('');
}

function buildSectionsHtml(sections) {
  return sections
    .filter(function (s) { return s && s.content; })
    .map(function (s) {
      return (
        '<h2 style="font-family:Georgia,serif;font-weight:400;font-size:16px;color:#2D5439;margin:20px 0 8px;">' + escapeHtml(s.heading) + '</h2>' +
        nl2p(s.content)
      );
    })
    .join('');
}

function buildEmailHtml(data) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 16px;">' + escapeHtml(data.title) + '</h1>' +
        '<p style="font-size:14px;color:#5b6f5f;margin:0 0 4px;"><strong>Client:</strong> ' + escapeHtml(data.clientName) + '</p>' +
        '<p style="font-size:14px;color:#5b6f5f;margin:0 0 20px;"><strong>Date:</strong> ' + escapeHtml(data.sessionDate) + '</p>' +
        buildSectionsHtml(data.sections) +
        '<hr style="border:none;border-top:1px solid rgba(45,84,57,0.15);margin:24px 0 16px;">' +
        '<p style="font-size:13px;color:#5b8a63;margin:0;">Any questions about this report? Just reply to this email.</p>' +
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

    if (!clientName || !clientEmail || !sessionDate || sections.length === 0) {
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

    const emailPayload = {
      from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
      to: to,
      bcc: [env.REPORT_BCC_EMAIL || 'thesensupportstudio@gmail.com'],
      subject: title + ' — ' + clientName + ' — ' + sessionDate,
      html: buildEmailHtml({ title, clientName, sessionDate, sections })
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
