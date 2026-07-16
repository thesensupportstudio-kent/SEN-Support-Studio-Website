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
  var child = data.child;
  var parent = data.parent;
  var diagnosis = data.diagnosis;
  var goals = data.goals;
  var profile = data.profile;

  var diagnosisList = (diagnosis.selected || []).concat(diagnosis.other ? [diagnosis.other] : []).join(', ');

  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Getting to Know ' + escapeHtml(child.childName) + '</h1>' +

        heading('Child') +
        row('Name', child.childName) +
        row('Date of birth', child.dob) +
        row('School', child.school) +
        row('Year group', child.yearGroup) +

        heading('Parent / carer') +
        row('Name', parent.parentName) +
        row('Relationship', parent.relationship) +
        row('Email', parent.parentEmail) +
        row('Phone', parent.parentPhone) +

        heading('Diagnosis & support') +
        row('Diagnosed or suspected conditions', diagnosisList) +
        row('EHCP / SEN Support', diagnosis.ehcp) +
        row('Notes', diagnosis.notes) +

        heading('Goals & targets') +
        row('Focus', goals.focus) +
        row('School/EHCP targets', goals.targets) +

        heading('Getting to know them') +
        row('Interests / motivators', profile.interests) +
        row('Verbal / communication', profile.verbal) +
        row('Attention span', profile.attention) +
        row('Big no\'s / triggers', profile.bigNos) +
        row('Anything else', profile.anythingElse) +

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
    const child = body.child || {};
    const parent = body.parent || {};
    const goals = body.goals || {};

    const childName = (child.childName || '').trim();
    const parentName = (parent.parentName || '').trim();
    const parentEmail = (parent.parentEmail || '').trim();
    const focus = (goals.focus || '').trim();

    if (!childName || !parentName || !parentEmail || !focus) {
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

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email sending is not configured yet.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const notifyTo = env.INTAKE_NOTIFY_EMAIL || 'admin@sensupportstudio.com';

    const emailPayload = {
      from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
      to: [notifyTo],
      reply_to: parentEmail,
      subject: 'Getting to Know ' + childName,
      html: buildEmailHtml({
        child: child,
        parent: parent,
        diagnosis: body.diagnosis || {},
        goals: goals,
        profile: body.profile || {}
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
    console.log('Unhandled error in tuition-intake: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
