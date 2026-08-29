import { isResource, noStoreHeaders, sessionCookie } from '../../lib/private-access.js';

const MAX_BODY_BYTES = 256;

function send(response, status, body, extraHeaders = {}) {
  for (const [name, value] of Object.entries({ ...noStoreHeaders, ...extraHeaders })) response.setHeader(name, value);
  return response.status(status).json(body);
}

export default function handler(request, response) {
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
    try { body = JSON.parse(body); } catch { return send(response, 400, { ok: false }); }
  }
  const resource = body?.resource;
  if (!isResource(resource)) return send(response, 400, { ok: false });
  return send(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie(resource, '', 0) });
}
