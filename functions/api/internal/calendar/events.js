import { getValidAccessToken, isConnected } from '../../_lib/google.js';
import { buildEventBody, callGoogle, errorResponse, EVENTS_URL } from '../../_lib/calendarEvent.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const connected = await isConnected(env);
  if (!connected) {
    return new Response(JSON.stringify({ connected: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let accessToken;
  try {
    accessToken = await getValidAccessToken(env);
  } catch (err) {
    console.log('Could not get valid Google access token: ' + String(err && err.message));
    return new Response(JSON.stringify({ connected: false, error: 'Could not refresh Google access - try reconnecting.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!accessToken) {
    return new Response(JSON.stringify({ connected: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const daysParam = parseInt(url.searchParams.get('days') || '14', 10);
  const days = Math.min(Math.max(daysParam || 14, 1), 60);

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).toISOString();

  const calendarUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?' + new URLSearchParams({
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });

  try {
    const resp = await fetch(calendarUrl, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(function () { return ''; });
      console.log('Google Calendar API error: ' + resp.status + ' ' + detail);
      // Stay in the 4xx range - Cloudflare swaps a generic branded page in
      // for any 5xx response, which would hide the real reason from the UI.
      const status = resp.status >= 400 && resp.status < 500 ? resp.status : 422;
      return new Response(JSON.stringify({ error: 'Could not load your calendar.', detail: detail }), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await resp.json();
    const events = (data.items || []).map(function (item) {
      return {
        id: item.id,
        title: item.summary || '(No title)',
        start: item.start ? (item.start.dateTime || item.start.date) : null,
        end: item.end ? (item.end.dateTime || item.end.date) : null,
        allDay: !!(item.start && item.start.date && !item.start.dateTime),
        location: item.location || '',
        description: item.description || '',
        htmlLink: item.htmlLink || ''
      };
    });

    return new Response(JSON.stringify({ connected: true, events: events }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/calendar/events: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
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

  try {
    const eventBody = buildEventBody(body);
    const created = await callGoogle(env, EVENTS_URL, {
      method: 'POST',
      body: JSON.stringify(eventBody)
    });
    return new Response(JSON.stringify({ ok: true, id: created.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error creating calendar event: ' + String(err && err.message));
    return errorResponse(err);
  }
}
