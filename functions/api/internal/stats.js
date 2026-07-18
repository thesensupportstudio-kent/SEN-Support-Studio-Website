import { getValidAccessToken } from '../_lib/google.js';

async function countSessionsThisMonth(env) {
  let accessToken;
  try {
    accessToken = await getValidAccessToken(env);
  } catch (err) {
    console.log('Could not get valid Google access token for stats: ' + String(err && err.message));
    return null;
  }
  if (!accessToken) return null;

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const calendarUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?' + new URLSearchParams({
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: 'true',
    maxResults: '250'
  });

  try {
    const resp = await fetch(calendarUrl, { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!resp.ok) {
      const detail = await resp.text().catch(function () { return ''; });
      console.log('Google Calendar API error in stats: ' + resp.status + ' ' + detail);
      return null;
    }
    const data = await resp.json();
    return (data.items || []).length;
  } catch (err) {
    console.log('Unhandled error counting sessions this month: ' + String(err && err.message));
    return null;
  }
}

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const activeClientsRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM clients WHERE status = 'active'"
    ).first();

    const invoicesOutstandingRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM interactions WHERE type = 'invoice_sent' AND paid_at IS NULL"
    ).first();

    const sessionsThisMonth = await countSessionsThisMonth(env);

    return new Response(JSON.stringify({
      activeClients: activeClientsRow ? activeClientsRow.count : 0,
      invoicesOutstanding: invoicesOutstandingRow ? invoicesOutstandingRow.count : 0,
      sessionsThisMonth: sessionsThisMonth
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/stats: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Could not load stats.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
