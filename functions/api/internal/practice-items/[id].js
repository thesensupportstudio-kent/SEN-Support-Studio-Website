import { deletePracticeItem } from '../../_lib/practiceItems.js';

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
    return new Response(JSON.stringify({ error: 'Missing item id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const item = await deletePracticeItem(env, id);
    if (item.image_key && env.FILES) {
      await env.FILES.delete(item.image_key).catch(function () {});
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('Unhandled error in internal/practice-items/[id] DELETE: ' + String(err && err.message));
    return new Response(JSON.stringify({ error: err.message || 'Could not delete this item.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
