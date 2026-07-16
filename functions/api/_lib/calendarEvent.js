import { getValidAccessToken } from './google.js';

export const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// UK clocks go forward 1am UTC on the last Sunday of March, and back 1am UTC
// on the last Sunday of October. This app only ever runs for a UK practice,
// so BST/GMT is worked out with plain date arithmetic rather than Intl -
// Cloudflare's production Workers runtime has known gaps in IANA timezone
// data that don't always show up in local dev, and a hard crash there isn't
// worth it just to support timezones this app never uses.
function lastSundayUtcMs(year, monthIndex) {
  const d = new Date(Date.UTC(year, monthIndex + 1, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getTime();
}

function isBst(dateStr, timeStr) {
  const naiveUtc = new Date(dateStr + 'T' + timeStr + ':00Z').getTime();
  const year = new Date(naiveUtc).getUTCFullYear();
  const bstStart = lastSundayUtcMs(year, 2) + 60 * 60000; // last Sunday of March, 01:00 UTC
  const bstEnd = lastSundayUtcMs(year, 9) + 60 * 60000; // last Sunday of October, 01:00 UTC
  return naiveUtc >= bstStart && naiveUtc < bstEnd;
}

// Google Calendar rejects dateTime values that omit a UTC offset, even when
// timeZone is also set, so work out the real offset for this moment.
function offsetString(timeZone, dateStr, timeStr) {
  return isBst(dateStr, timeStr) ? '+01:00' : '+00:00';
}

export function buildEventBody(body) {
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
    event.start = { dateTime: date + 'T' + startTime + ':00' + offsetString(timeZone, date, startTime), timeZone: timeZone };
    event.end = { dateTime: date + 'T' + endTime + ':00' + offsetString(timeZone, date, endTime), timeZone: timeZone };
  }

  return event;
}

export async function callGoogle(env, url, options) {
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
    let message = 'Google Calendar rejected the request.';
    try {
      const parsed = JSON.parse(detail);
      if (parsed && parsed.error && parsed.error.message) message = parsed.error.message;
    } catch (e) {}
    const err = new Error(message);
    err.status = 502;
    err.detail = detail;
    throw err;
  }

  if (resp.status === 204) return null;
  return resp.json();
}

export function errorResponse(err) {
  const status = err.status || 400;
  return new Response(JSON.stringify({ error: err.message, detail: err.detail }), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}
