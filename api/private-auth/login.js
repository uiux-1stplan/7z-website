import { issueSession, isResource, noStoreHeaders, safeNextPath, sessionCookie, validCredentials } from '../../lib/private-access.js';

const MAX_BODY_BYTES = 2048;
const MAX_FIELD_LENGTH = 256;
const FAILURE_DELAY_MS = 350;

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
    return send(response, 405, { ok: false });
  }

  const mediaType = String(request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') return send(response, 415, { ok: false });
  const declaredSize = Number(request.headers['content-length'] || 0);
  if (!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > MAX_BODY_BYTES) return send(response, 413, { ok: false });

  let body = request.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return send(response, 413, { ok: false });
    try { body = JSON.parse(body); } catch { return send(response, 400, { ok: false }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(response, 400, { ok: false });
  let serializedBody;
  try { serializedBody = JSON.stringify(body); } catch { return send(response, 400, { ok: false }); }
  if (Buffer.byteLength(serializedBody, 'utf8') > MAX_BODY_BYTES) return send(response, 413, { ok: false });

  const { resource, clientId, accessKey, next } = body;
  const destination = isResource(resource) ? safeNextPath(resource, next) : null;
  if (!isResource(resource) || !destination || !validText(clientId) || !validText(accessKey)) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return send(response, 401, { ok: false, error: 'Access not recognized' });
  }

  const credentialsAreValid = await validCredentials(resource, clientId, accessKey, process.env);
  const secret = process.env.PRIVATE_ACCESS_SESSION_SECRET;
  if (!credentialsAreValid || typeof secret !== 'string' || secret.length < 32) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return send(response, 401, { ok: false, error: 'Access not recognized' });
  }

  const session = await issueSession(resource, secret);
  if (!session) return send(response, 503, { ok: false });
  return send(response, 200, { ok: true, next: destination }, { 'Set-Cookie': sessionCookie(resource, session) });
}
