import { buildEventBody, callGoogle, errorResponse, EVENTS_URL } from '../../../_lib/calendarEvent.js';

export async function onRequestPatch(context) {
  const { request, env, params } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = params.id;
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
  const { env, params } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = params.id;
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
