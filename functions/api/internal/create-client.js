import { createClient } from '../_lib/clients.js';

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

  const parentName = (body.parentName || '').trim();
  const parentEmail = (body.parentEmail || '').trim();
  const parentPhone = (body.parentPhone || '').trim();
  const childName = (body.childName || '').trim();
  const school = (body.school || '').trim();

  if (!parentEmail) {
    return new Response(JSON.stringify({ error: 'Please enter an email address.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await createClient(env, { parentName, parentEmail, parentPhone, childName, school });
    return new Response(JSON.stringify({ ok: true, id: result.id, created: result.created }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/create-client: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not add this client.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
