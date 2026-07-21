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

// Studio working hours, keyed by Date#getDay() (0 = Sunday). Used to generate
// bookable slots for the client self-service portal - a day absent from this
// map is closed.
export const WORKING_HOURS = {
  1: { start: '09:00', end: '19:00' },
  2: { start: '09:00', end: '19:00' },
  3: { start: '09:00', end: '19:00' },
  4: { start: '09:00', end: '19:00' },
  5: { start: '09:00', end: '19:00' },
  6: { start: '09:00', end: '12:00' }
};

// Travel time between sessions (or any other calendar commitment) - padded
// onto both sides of every busy range before checking a slot against it, so
// back-to-back bookings (or a booking right up against an existing
// appointment) always leave room to get from one place to the next.
export const BOOKING_BUFFER_MINUTES = 30;
const BOOKING_BUFFER_MS = BOOKING_BUFFER_MINUTES * 60000;

// Shared by slot generation and the last-moment double-booking check, so a
// slot is never offered - or accepted - without the same buffer either side.
export function overlapsBusyWithBuffer(busyRanges, startMs, endMs) {
  return busyRanges.some(function (b) {
    return (b.start - BOOKING_BUFFER_MS) < endMs && (b.end + BOOKING_BUFFER_MS) > startMs;
  });
}

// Converts a wall-clock local date/time into an ISO string with the correct
// UK offset, for anything that needs to build or compare Google Calendar
// dateTime values outside of buildEventBody itself.
export function localToIso(dateStr, timeStr, timeZone) {
  return dateStr + 'T' + timeStr + ':00' + offsetString(timeZone || 'Europe/London', dateStr, timeStr);
}

function minutesToTimeStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function timeStrToMinutes(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Fetches all events in the given ISO range and returns simplified busy
// ranges (as millisecond timestamps), treating all-day events as busy for
// their entire span. Shared by the availability lookup and the booking
// endpoint's last-moment double-booking check.
export async function listBusyRanges(env, timeMinIso, timeMaxIso) {
  const url = EVENTS_URL + '?' + new URLSearchParams({
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });
  const data = await callGoogle(env, url, { method: 'GET' });
  return (data.items || []).map(function (item) {
    const start = item.start && (item.start.dateTime || (item.start.date + 'T00:00:00Z'));
    const end = item.end && (item.end.dateTime || (item.end.date + 'T00:00:00Z'));
    return { start: new Date(start).getTime(), end: new Date(end).getTime() };
  });
}

// Pure function: given busy ranges (ms timestamps) and a starting point,
// walks forward `days` calendar days and returns every working-hours slot of
// `sessionMinutes` length that doesn't overlap a busy range and isn't in the
// past. Kept pure/exported so slot math can be unit tested without a live
// Google connection.
//
// Slots start BOOKING_BUFFER_MINUTES apart from the session length, not
// back-to-back - the session itself stays `sessionMinutes` long (that's
// what's actually booked and paid for), but the next slot isn't offered
// until sessionMinutes + the buffer has passed, so the grid itself always
// has travel time built in rather than relying on a slot only disappearing
// after something else gets booked into it.
export function generateAvailableSlots(busyRanges, sessionMinutes, days, fromDate, nowMs) {
  const now = nowMs != null ? nowMs : Date.now();
  const start = fromDate ? new Date(fromDate + 'T00:00:00Z') : new Date(now);
  const slots = [];
  const slotStep = sessionMinutes + BOOKING_BUFFER_MINUTES;

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + dayOffset));
    const dow = d.getUTCDay();
    const hours = WORKING_HOURS[dow];
    if (!hours) continue;

    const dateStr = d.toISOString().slice(0, 10);
    const startMin = timeStrToMinutes(hours.start);
    const endMin = timeStrToMinutes(hours.end);

    for (let slotStart = startMin; slotStart + sessionMinutes <= endMin; slotStart += slotStep) {
      const startTime = minutesToTimeStr(slotStart);
      const endTime = minutesToTimeStr(slotStart + sessionMinutes);
      const startIso = localToIso(dateStr, startTime);
      const endIso = localToIso(dateStr, endTime);
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();

      if (startMs <= now) continue;

      if (overlapsBusyWithBuffer(busyRanges, startMs, endMs)) continue;

      slots.push({ date: dateStr, startTime: startTime, endTime: endTime, startIso: startIso, endIso: endIso });
    }
  }

  return slots;
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
    // Stay in the 4xx range even though this is really an upstream failure -
    // Cloudflare silently swaps in its own generic branded page for any 5xx
    // response, which would hide the real reason (and Google's own error
    // codes are 4xx here anyway: auth/scope/validation problems).
    err.status = resp.status >= 400 && resp.status < 500 ? resp.status : 422;
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
