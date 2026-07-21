import { formatUkDateTime } from '../_lib/calendarEvent.js';

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReminderHtml(booking, whenText) {
  return (
    '<div style="background:#FBFAF5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#2D5439;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">' +
        '<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5b8a63;margin:0 0 4px;">SEN Support Studio</p>' +
        '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;color:#2D5439;margin:0 0 20px;">See you soon!</h1>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0 0 20px;">Hi ' + escapeHtml(booking.parent_name || 'there') + ', just a reminder about your upcoming session.</p>' +
        '<div style="background:#FBFAF5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">' +
          '<p style="font-size:14px;color:#5b6f5f;margin:0 0 4px;">' + escapeHtml(booking.service_label) + '</p>' +
          '<p style="font-size:16px;font-weight:700;color:#2D5439;margin:0;">' + escapeHtml(whenText) + '</p>' +
        '</div>' +
        '<p style="font-size:15px;color:#3f5943;line-height:1.6;margin:0;">Need to reschedule or cancel? Log in to your account to manage this booking.</p>' +
      '</div>' +
    '</div>'
  );
}

// Called on a schedule (see the separate Cron Worker) rather than from any
// user action, so it's protected with a shared secret instead of a client
// or staff session.
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (!env.CRON_SECRET) {
    console.log('CRON_SECRET is not configured - rejecting scheduled call.');
    return new Response(JSON.stringify({ error: 'Not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader !== 'Bearer ' + env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email sending is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Picks up any not-yet-reminded booking that's now within 48 hours -
    // whatever cadence the cron runs at, each booking is caught exactly
    // once the first time it crosses that threshold, and reminder_sent_at
    // stops it going out twice.
    const due = await env.DB.prepare(
      "SELECT b.id, b.start_at, p.service_label, c.parent_name, c.parent_email " +
      "FROM pack_bookings b " +
      "JOIN clients c ON c.id = b.client_id " +
      "JOIN session_packs p ON p.id = b.pack_id " +
      "WHERE b.status = 'booked' AND b.reminder_sent_at IS NULL " +
      "AND b.start_at <= datetime('now', '+48 hours') AND b.start_at > datetime('now')"
    ).all();

    const bookings = due.results || [];
    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      if (!booking.parent_email) {
        await env.DB.prepare('UPDATE pack_bookings SET reminder_sent_at = ? WHERE id = ?').bind('skipped-no-email', booking.id).run();
        continue;
      }

      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: env.REPORT_FROM_EMAIL || 'SEN Support Studio <onboarding@resend.dev>',
            to: [booking.parent_email],
            subject: 'Reminder: your upcoming session - SEN Support Studio',
            html: buildReminderHtml(booking, formatUkDateTime(booking.start_at))
          })
        });

        if (resp.ok) {
          await env.DB.prepare("UPDATE pack_bookings SET reminder_sent_at = datetime('now') WHERE id = ?").bind(booking.id).run();
          sent++;
        } else {
          const detail = await resp.text().catch(function () { return ''; });
          console.log('Resend rejected reminder for booking ' + booking.id + ': ' + resp.status + ' ' + detail);
          failed++;
        }
      } catch (err) {
        console.log('Reminder send failed for booking ' + booking.id + ': ' + String(err && err.message));
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, checked: bookings.length, sent: sent, failed: failed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in cron/send-reminders: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
