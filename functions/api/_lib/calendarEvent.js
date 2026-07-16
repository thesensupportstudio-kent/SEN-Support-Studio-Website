import { getValidAccessToken } from './google.js';

export const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Google Calendar rejects dateTime values that omit a UTC offset, even when
// timeZone is also set, so work out the real offset for this zone/moment.
function offsetString(timeZone, dateStr, timeStr) {
  const naiveUtc = new Date(dateStr + 'T' + timeStr + ':00Z');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(naiveUtc);
  const map = {};
  parts.forEach(function (p) { map[p.type] = p.value; });
  const hour = map.hour === '24' ? 0 : Number(map.hour);
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second));
  const diffMinutes = Math.round((asUtc - naiveUtc.getTime()) / 60000);
  const sign = diffMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(diffMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return sign + hh + ':' + mm;
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
