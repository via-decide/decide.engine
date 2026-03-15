import { json, parseJsonBody, safeEqual } from './_skillhex.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method Not Allowed' }, 405);
  }

  const body = await parseJsonBody(request);
  if (!body) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const loginId = String(body.loginId || '').trim();
  const password = String(body.password || '').trim();

  if (!loginId || !password) {
    return json({ ok: false, error: 'loginId and password are required' }, 400);
  }

  const configuredLoginId = String(env.RECRUITER_LOGIN_ID || '').trim();
  const configuredPassword = String(env.RECRUITER_PASSWORD || '').trim();
  const recruiterToken = String(env.RECRUITER_API_TOKEN || '').trim();

  if (!configuredLoginId || !configuredPassword || !recruiterToken) {
    return json({ ok: false, error: 'Recruiter auth is not configured' }, 503);
  }

  const valid = safeEqual(loginId, configuredLoginId) && safeEqual(password, configuredPassword);

  if (!valid) {
    return json({ ok: false, error: 'Invalid credentials' }, 401);
  }

  return json({ ok: true, token: recruiterToken });
}
