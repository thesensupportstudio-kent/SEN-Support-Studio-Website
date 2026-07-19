import { isConnected } from '../_lib/google.js';
import { listBusyRanges, generateAvailableSlots } from '../_lib/calendarEvent.js';
import { requireClientSession } from '../_lib/clientAuth.js';
import { getPackById } from '../_lib/packs.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'This isn’t available yet - please get in touch instead.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const packId = (url.searchParams.get('packId') || '').trim();
  const daysParam = parseInt(url.searchParams.get('days') || '21', 10);
  const days = Math.min(Math.max(daysParam || 21, 1), 60);

  if (!packId) {
    return new Response(JSON.stringify({ error: 'Missing pack.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await requireClientSession(request, env);
    if (!client) {
      return new Response(JSON.stringify({ error: 'Not logged in.' }), {
        status: 401,
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
    if (pack.pack_type !== 'ongoing' && pack.remaining_sessions < 1) {
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

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).toISOString();

    const busyRanges = await listBusyRanges(env, timeMin, timeMax);
    const slots = generateAvailableSlots(busyRanges, pack.session_minutes, days);

    return new Response(JSON.stringify({ ok: true, slots: slots }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in portal/availability: ' + String(err && err.message));
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    return new Response(JSON.stringify({ error: err.message || 'Could not load availability.', detail: err.detail }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
