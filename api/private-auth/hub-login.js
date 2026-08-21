import { HUB_ADMIN_SCOPES, HUB_PUBLIC_SCOPES, adminSessionCookie, issueAdminSession, issueSession, noStoreHeaders, sessionCookie, validAdminCredentials, validCredentials } from '../../lib/private-access.js';

const MAX_BODY_BYTES = 2048;
const MAX_FIELD_LENGTH = 256;
const FAILURE_DELAY_MS = 550;

function send(response, status, body, extraHeaders = {}) {
  for (const [name, value] of Object.entries({ ...noStoreHeaders, ...extraHeaders })) response.setHeader(name, value);
  return response.status(status).json(body);
}

function validText(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD_LENGTH;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { ok: false, admin: false, allowed: [] });
  }

  const mediaType = String(request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') return send(response, 415, { ok: false, admin: false, allowed: [] });

  const declaredSize = Number(request.headers['content-length'] || 0);
  if (!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > MAX_BODY_BYTES) {
    return send(response, 413, { ok: false, admin: false, allowed: [] });
  }

  let body = request.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return send(response, 413, { ok: false, admin: false, allowed: [] });
    try { body = JSON.parse(body); } catch { return send(response, 400, { ok: false, admin: false, allowed: [] }); }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(response, 400, { ok: false, admin: false, allowed: [] });

  const { clientId, accessKey } = body;
  if (!validText(clientId) || !validText(accessKey)) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return send(response, 401, { ok: false, admin: false, allowed: [], error: 'Login To Explore' });
  }

  const adminSecret = process.env.PRIVATE_ACCESS_ADMIN_SESSION_SECRET;
  const adminValid = await validAdminCredentials(clientId, accessKey, process.env);
  if (adminValid && typeof adminSecret === 'string' && adminSecret.length >= 32) {
    const session = await issueAdminSession(adminSecret);
    if (!session) return send(response, 503, { ok: false, admin: false, allowed: [] });
    return send(response, 200, { ok: true, admin: true, allowed: HUB_ADMIN_SCOPES }, { 'Set-Cookie': adminSessionCookie(session) });
  }

  const secret = process.env.PRIVATE_ACCESS_SESSION_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) return send(response, 503, { ok: false, admin: false, allowed: [] });

  for (const scope of HUB_PUBLIC_SCOPES) {
    const valid = await validCredentials(scope, clientId, accessKey, process.env);
    if (!valid) continue;

    const session = await issueSession(scope, secret);
    if (!session) return send(response, 503, { ok: false, admin: false, allowed: [] });

    return send(response, 200, { ok: true, admin: false, allowed: [scope] }, { 'Set-Cookie': sessionCookie(scope, session) });
  }

  await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
  return send(response, 401, { ok: false, admin: false, allowed: [], error: 'Login To Explore' });
}