export async function onRequestGet(context) {
  const { request, env } = context;

  const clientId = (env.GOOGLE_CLIENT_ID || '').trim();

  if (!clientId) {
    return new Response('Google Calendar is not configured yet (missing GOOGLE_CLIENT_ID).', { status: 503 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = origin + '/api/internal/auth/google/callback';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent'
  });

  return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(), 302);
}
