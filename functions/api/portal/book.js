import { isConnected } from '../_lib/google.js';
import { listBusyRanges, localToIso, buildEventBody, callGoogle, EVENTS_URL } from '../_lib/calendarEvent.js';
import { getClientByPortalToken, getPackById, createBooking } from '../_lib/packs.js';
import { logInteraction } from '../_lib/clients.js';

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
  const packId = (body.packId || '').toString().trim();
  const date = (body.date || '').toString().trim();
  const startTime = (body.startTime || '').toString().trim();
  const endTime = (body.endTime || '').toString().trim();

  if (!token || !packId || !date || !startTime || !endTime) {
    return new Response(JSON.stringify({ error: 'Missing booking details.' }), {
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

    const pack = await getPackById(env, packId);
    if (!pack || pack.client_id !== client.id) {
      return new Response(JSON.stringify({ error: 'Pack not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (pack.remaining_sessions < 1) {
      return new Response(JSON.stringify({ error: 'No sessions remaining on this pack.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const connected = await isConnected(env);
    if (!connected) {
      return new Response(JSON.stringify({ error: 'Booking is temporarily unavailable - please get in touch directly to arrange your session.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const startIso = localToIso(date, startTime);
    const endIso = localToIso(date, endTime);

    if (new Date(startIso).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: 'That time has already passed - please choose another slot.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Re-check the slot is still free right before booking, to close the
    // race window between the client loading availability and clicking book.
    const dayStart = new Date(date + 'T00:00:00Z');
    const timeMin = dayStart.toISOString();
    const timeMax = new Date(dayStart.getTime() + 24 * 60 * 60000).toISOString();
    const busyRanges = await listBusyRanges(env, timeMin, timeMax);
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    const stillFree = !busyRanges.some(function (b) { return b.start < endMs && b.end > startMs; });

    if (!stillFree) {
      return new Response(JSON.stringify({ error: 'That slot was just taken - please choose another time.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const title = pack.service_label + ' - ' + (client.child_name || client.parent_name || client.parent_email);
    const eventBody = buildEventBody({
      title: title,
      description: 'Booked via client portal (session pack: ' + pack.service_label + ')',
      date: date,
      startTime: startTime,
      endTime: endTime
    });

    const created = await callGoogle(env, EVENTS_URL, {
      method: 'POST',
      body: JSON.stringify(eventBody)
    });

    await createBooking(env, {
      packId: pack.id,
      clientId: client.id,
      calendarEventId: created.id,
      startAt: startIso,
      endAt: endIso
    });

    await logInteraction(env, {
      clientId: client.id,
      type: 'session_booked',
      summary: 'Booked ' + pack.service_label + ' session for ' + date + ' ' + startTime
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in portal/book: ' + String(err && err.message));
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    return new Response(JSON.stringify({ error: err.message || 'Could not complete this booking.', detail: err.detail }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
