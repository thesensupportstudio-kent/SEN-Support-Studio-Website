export async function onRequestPost(context) {
  return new Response(JSON.stringify({ ok: true, diagnostic: 'minimal handler reached' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
