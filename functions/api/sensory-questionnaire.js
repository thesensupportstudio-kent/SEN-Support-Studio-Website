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

function renderList(items) {
  if (!items || !items.length) return '';
  return (
    '<ul style="margin:4px 0 16px;padding-left:20px;">' +
    items.map(function (item) {
      return '<li style="font-size:14px;color:#3f5943;line-height:1.5;">' + escapeHtml(item) + '</li>';
    }).join('') +
    '</ul>'
  );
}

function renderCategory(cat) {
  var extraHtml = cat.extra
    ? '<p style="font-size:14px;color:#3f5943;line-height:1.5;margin:8px 0 0;"><strong>' + escapeHtml(cat.extraLabel || 'Notes') + ':</strong> ' + nl2br(cat.extra) + '</p>'
    : '';

  if (cat.type === 'single') {
    if ((!cat.selected || !cat.selected.length) && !extraHtml) return '';
    return (
      '<h3 style="font-family:Georgia,serif;font-weight:400;font-size:17px;color:#2D5439;margin:20px 0 4px;">' + escapeHtml(cat.title) + '</h3>' +
      renderList(cat.selected) +
      extraHtml
    );
  }

  var colsHtml = (cat.columns || []).map(function (col) {
    if (!col.selected || !col.selected.length) return '';
    return (
      '<p style="font-size:14px;font-weight:700;color:#2D5439;margin:8px 0 2px;">' + escapeHtml(col.label) + '</p>' +
      renderList(col.selected)
    );
  }).join('');

  if (!colsHtml && !extraHtml) return '';

  return (
    '<h3 style="font-family:Georgia,serif;font-weight:400;font-size:17px;color:#2D5439;margin:20px 0 4px;">' + escapeHtml(cat.title) + '</h3>' +
    colsHtml +
    extraHtml
  );
}

function buildEmailHtml(data) {
  var child = data.child;

  var childRows = [
    ['Child', child.childName],
    ['Date of birth', child.dob],
    ['School', child.school],
    ['Class / year group', child.klass],
    ['Completed by', child.completedBy],
    ['Contact email', child.contactEmail]
  ].filter(function (row) { return row[1]; }).map(function (row) {
    return '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 4px;"><strong>' + escapeHtml(row[0]) + ':</strong> ' + escapeHtml(row[1]) + '</p>';
  }).join('');

  var categoriesHtml = (data.categories || []).map(renderCategory).join('');

  var adlEntries = Object.keys(data.adl || {}).filter(function (key) { return data.adl[key]; });
  var adlHtml = adlEntries.length
    ? '<h3 style="font-family:Georgia,serif;font-weight:400;font-size:17px;color:#2D5439;margin:20px 0 4px;">Daily living</h3>' +
      adlEntries.map(function (key) {
        return '<p style="font-size:14px;color:#3f5943;line-height:1.5;margin:0 0 8px;"><strong>' + escapeHtml(key) + ':</strong> ' + nl2br(data.adl[key]) + '</p>';
      }).join('')
    : '';

  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">New Sensory Profile Questionnaire</h1>' +
        childRows +
        categoriesHtml +
        adlHtml +
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
    const childName = (child.childName || '').trim();
    const completedBy = (child.completedBy || '').trim();
    const contactEmail = (child.contactEmail || '').trim();

    if (!childName || !completedBy) {
      return new Response(JSON.stringify({ error: 'Please fill in the child’s name and who completed this form.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (contactEmail && !EMAIL_RE.test(contactEmail)) {
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

    const notifyTo = env.SENSORY_NOTIFY_EMAIL || 'admin@sensupportstudio.com';

    const emailPayload = {
      from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
      to: [notifyTo],
      subject: 'Sensory Profile Questionnaire — ' + childName,
      html: buildEmailHtml({
        child: child,
        categories: Array.isArray(body.categories) ? body.categories : [],
        adl: body.adl || {}
      })
    };

    if (contactEmail) emailPayload.reply_to = contactEmail;

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
    console.log('Unhandled error in sensory-questionnaire: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
