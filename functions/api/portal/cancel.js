import { callGoogle, EVENTS_URL } from '../_lib/calendarEvent.js';
import { getClientByPortalToken, getBookingById, cancelBooking } from '../_lib/packs.js';
import { logInteraction } from '../_lib/clients.js';

const NOTICE_HOURS = 24;

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

  const token = (body.token || '').toString().trim();
  const bookingId = (body.bookingId || '').toString().trim();

  if (!token || !bookingId) {
    return new Response(JSON.stringify({ error: 'Missing booking id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await getClientByPortalToken(env, token);
    if (!client) {
      return new Response(JSON.stringify({ error: 'This link isn’t recognised.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const booking = await getBookingById(env, bookingId);
    if (!booking || booking.client_id !== client.id) {
      return new Response(JSON.stringify({ error: 'Booking not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (booking.status !== 'booked') {
      return new Response(JSON.stringify({ error: 'This session is already cancelled.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const noticeHours = (new Date(booking.start_at).getTime() - Date.now()) / 3600000;
    const refundCredit = noticeHours >= NOTICE_HOURS;

    try {
      await callGoogle(env, EVENTS_URL + '/' + encodeURIComponent(booking.calendar_event_id), { method: 'DELETE' });
    } catch (err) {
      // A 404/410 here just means the event is already gone from the
      // calendar (e.g. deleted manually) - still fine to cancel our record.
      if (!(err.status === 404 || err.status === 410)) throw err;
    }

    await cancelBooking(env, { bookingId: booking.id, refundCredit: refundCredit });

    await logInteraction(env, {
      clientId: client.id,
      type: 'session_cancelled',
      summary: 'Cancelled session for ' + booking.start_at + (refundCredit ? ' (credit refunded)' : ' (within ' + NOTICE_HOURS + 'h notice - credit used)')
    });

    return new Response(JSON.stringify({ ok: true, refunded: refundCredit }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in portal/cancel: ' + String(err && err.message));
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    return new Response(JSON.stringify({ error: err.message || 'Could not cancel this session.', detail: err.detail }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
