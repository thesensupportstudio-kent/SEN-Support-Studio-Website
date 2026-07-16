import { exchangeCodeForTokens } from '../../../_lib/google.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return Response.redirect(url.origin + '/internal/calendar.html?error=' + encodeURIComponent(error), 302);
  }

  if (!code) {
    return Response.redirect(url.origin + '/internal/calendar.html?error=missing_code', 302);
  }

  try {
    const redirectUri = url.origin + '/api/internal/auth/google/callback';
    await exchangeCodeForTokens(env, code, redirectUri);
    return Response.redirect(url.origin + '/internal/calendar.html?connected=1', 302);
  } catch (err) {
    console.log('Google OAuth callback failed: ' + String(err && err.message));
    return Response.redirect(url.origin + '/internal/calendar.html?error=exchange_failed', 302);
  }
}
