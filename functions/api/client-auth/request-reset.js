function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(parentName, resetUrl) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">Reset your password</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(parentName || 'there') + ', use the link below to set a new password. It expires in an hour.</p>' +
        '<a href="' + resetUrl + '" style="display:inline-block;background:#2D5439;color:#F8F1DE;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;">Reset password &rarr;</a>' +
        '<p style="font-size:13px;color:#5b6f5f;margin:20px 0 0;">If you didn’t ask for this, you can ignore this email.</p>' +
      '</div>' +
    '</div>'
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'This isn’t available yet - please get in touch instead.' }), {
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

  const email = (body.email || '').toString().trim().toLowerCase();
  if (!email) {
    return new Response(JSON.stringify({ error: 'Please enter your email.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Always return the same success response whether or not the email
  // matches an account, so this can't be used to check who has one.
  const genericOk = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  try {
    const client = await env.DB.prepare('SELECT * FROM clients WHERE parent_email = ?').bind(email).first();
    if (!client || !env.RESEND_API_KEY) return genericOk;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    await env.DB.prepare(
      "INSERT INTO client_password_tokens (client_id, token, purpose, expires_at) VALUES (?, ?, 'reset', ?)"
    ).bind(client.id, token, expiresAt).run();

    const origin = new URL(request.url).origin;
    const resetUrl = origin + '/client-set-password.html?token=' + token;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
        to: [client.parent_email],
        subject: 'Reset your password - SEN Support Studio',
        html: buildEmailHtml(client.parent_name, resetUrl)
      })
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(function () { return ''; });
      console.log('Resend rejected password reset email: ' + resendResp.status + ' ' + detail);
    }

    return genericOk;
  } catch (err) {
    console.log('Unhandled error in client-auth/request-reset: ' + String(err && err.message));
    return genericOk;
  }
}
