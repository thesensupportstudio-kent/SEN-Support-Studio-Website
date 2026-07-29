export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.FILES) {
    return new Response('File storage is not configured yet.', { status: 503 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  const isKnownKey = /^(reports|invoices|documents)\/[A-Za-z0-9._-]+$/.test(key)
    || /^practice-images\/[0-9]+\/[A-Za-z0-9._-]+$/.test(key)
    || /^practice-pdfs\/[0-9]+\/[A-Za-z0-9._-]+$/.test(key);
  if (!isKnownKey) {
    return new Response('Invalid file key.', { status: 400 });
  }

  const object = await env.FILES.get(key);
  if (!object) {
    return new Response('File not found.', { status: 404 });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': (object.httpMetadata && object.httpMetadata.contentType) || 'application/pdf',
      'Content-Disposition': 'inline; filename="' + key.split('/').pop() + '"'
    }
  });
}
