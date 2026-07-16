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

function row(label, value) {
  if (!value) return '';
  return '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 4px;"><strong>' + escapeHtml(label) + ':</strong> ' + nl2br(value) + '</p>';
}

function heading(text) {
  return '<h3 style="font-family:Georgia,serif;font-weight:400;font-size:17px;color:#2D5439;margin:20px 0 4px;">' + escapeHtml(text) + '</h3>';
}

function buildEmailHtml(data) {
  var parent = data.parent;
  var child = data.child;
  var emergency = data.emergency;
  var agreements = data.agreements;
  var signature = data.signature;

  var agreementsList = [
    agreements.emergency ? 'Emergency contact consent' : '',
    agreements.cancellation ? 'Cancellation policy' : '',
    agreements.privacy ? 'Privacy Notice' : '',
    agreements.safeguarding ? 'Safeguarding Policy' : ''
  ].filter(Boolean).join(', ');

  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Client Agreement — ' + escapeHtml(child.childName) + '</h1>' +

        heading('Parent / carer') +
        row('Name', parent.parentName) +
        row('Relationship', parent.relationship) +
        row('Email', parent.parentEmail) +
        row('Phone', parent.parentPhone) +
        row('Address', parent.parentAddress) +
        row('Preferred contact method', parent.preferredContact) +

        heading('Child') +
        row('Name', child.childName) +
        row('Date of birth', child.dob) +
        row('School', child.school) +

        heading('Emergency contact') +
        row('Name', emergency.emergencyName) +
        row('Phone', emergency.emergencyPhone) +

        heading('Medical & safety') +
        row('Medical info', data.medicalInfo) +
        row('Photo/recording consent', data.photoConsent) +

        heading('Agreements confirmed') +
        row('Agreed to', agreementsList) +

        heading('Signature') +
        row('Signed by', signature.name) +
        row('Date', signature.date) +

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
    const parent = body.parent || {};
    const child = body.child || {};
    const agreements = body.agreements || {};
    const signature = body.signature || {};

    const parentName = (parent.parentName || '').trim();
    const parentEmail = (parent.parentEmail || '').trim();
    const parentPhone = (parent.parentPhone || '').trim();
    const childName = (child.childName || '').trim();
    const signatureName = (signature.name || '').trim();
    const signatureDate = (signature.date || '').trim();

    if (!parentName || !parentEmail || !parentPhone || !childName || !signatureName || !signatureDate) {
      return new Response(JSON.stringify({ error: 'Please fill in the required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!EMAIL_RE.test(parentEmail)) {
      return new Response(JSON.stringify({ error: 'Please check the email address entered.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!agreements.emergency || !agreements.cancellation || !agreements.privacy || !agreements.safeguarding) {
      return new Response(JSON.stringify({ error: 'Please agree to all the required policies before submitting.' }), {
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

    const notifyTo = env.INTAKE_NOTIFY_EMAIL || env.CONTACT_TO_EMAIL || 'hello@sensupportstudio.com';

    const emailPayload = {
      from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
      to: [notifyTo],
      reply_to: parentEmail,
      subject: 'Client Agreement — ' + childName,
      html: buildEmailHtml({
        parent: parent,
        child: child,
        emergency: body.emergency || {},
        medicalInfo: (body.medicalInfo || '').trim(),
        photoConsent: body.photoConsent || '',
        agreements: agreements,
        signature: signature
      })
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
    console.log('Unhandled error in client-agreement: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
