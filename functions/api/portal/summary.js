import { getClientByPortalToken, getPacksForClient, getBookingsForClient } from '../_lib/packs.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'This isn’t available yet - please get in touch instead.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing link token.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await getClientByPortalToken(env, token);
    if (!client) {
      return new Response(JSON.stringify({ error: 'This link isn’t recognised - please check the email we sent you, or get in touch.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const packs = await getPacksForClient(env, client.id);
    const bookings = await getBookingsForClient(env, client.id, { upcomingOnly: true });

    return new Response(JSON.stringify({
      ok: true,
      parentName: client.parent_name,
      childName: client.child_name,
      packs: packs,
      bookings: bookings
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in portal/summary: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: 'Unexpected server error.', detail: String(err && err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
