import { getValidAccessToken } from '../../_lib/google.js';

const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildEventBody(body) {
  const title = (body.title || '').trim();
  const location = (body.location || '').trim();
  const description = (body.description || '').trim();
  const date = (body.date || '').trim();
  const allDay = !!body.allDay;
  const timeZone = (body.timeZone || 'Europe/London').trim();

  if (!title || !date) {
    throw new Error('Please fill in the required fields.');
  }

  const event = { summary: title };
  if (location) event.location = location;
  if (description) event.description = description;

  if (allDay) {
    event.start = { date: date };
    event.end = { date: addDays(date, 1) };
  } else {
    const startTime = (body.startTime || '').trim();
    const endTime = (body.endTime || '').trim();
    if (!startTime || !endTime) {
      throw new Error('Please set a start and end time, or mark this as an all-day event.');
    }
    event.start = { dateTime: date + 'T' + startTime + ':00', timeZone: timeZone };
    event.end = { dateTime: date + 'T' + endTime + ':00', timeZone: timeZone };
  }

  return event;
}

async function callGoogle(env, url, options) {
  const accessToken = await getValidAccessToken(env);
  if (!accessToken) {
    const err = new Error('Not connected to Google Calendar.');
    err.status = 409;
    throw err;
  }

  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(function () { return ''; });
    console.log('Google Calendar API error: ' + resp.status + ' ' + detail);
    const err = new Error('Google Calendar rejected the request.');
    err.status = 502;
    err.detail = detail;
    throw err;
  }

  if (resp.status === 204) return null;
  return resp.json();
}

function errorResponse(err) {
  const status = err.status || 400;
  return new Response(JSON.stringify({ error: err.message, detail: err.detail }), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
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

export async function onRequestPatch(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing event id.' }), {
      status: 400,
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
    await callGoogle(env, EVENTS_URL + '/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: JSON.stringify(eventBody)
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error updating calendar event: ' + String(err && err.message));
    return errorResponse(err);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing event id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await callGoogle(env, EVENTS_URL + '/' + encodeURIComponent(id), { method: 'DELETE' });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error deleting calendar event: ' + String(err && err.message));
    return errorResponse(err);
  }
}
