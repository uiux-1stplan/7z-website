import { createHash, timingSafeEqual } from 'node:crypto';
import { issueSignedToken, presignUrl } from '@vercel/blob';

const BLOB_PATHNAME = 'private/7z-magic-strategic-blueprint-2026-2027.pdf';
const MAX_PASSWORD_LENGTH = 256;
const MAX_BODY_LENGTH = 1024;
const headers = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff'
};

function send(response, status, body) {
  Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
  return response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { ok: false });
  }

  const mediaType = String(request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') return send(response, 415, { ok: false });

  const contentLength = Number(request.headers['content-length'] || 0);
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_BODY_LENGTH) {
    return send(response, 413, { ok: false });
  }

  let body = request.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_LENGTH) return send(response, 413, { ok: false });
    try {
      body = JSON.parse(body);
    } catch {
      return send(response, 400, { ok: false });
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(response, 400, { ok: false });

  const password = body.password;
  const expected = process.env.BLUEPRINT_ACCESS_PASSWORD;
  if (typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH || !expected) {
    return send(response, expected ? 400 : 503, { ok: false });
  }

  const suppliedDigest = createHash('sha256').update(password, 'utf8').digest();
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  if (!timingSafeEqual(suppliedDigest, expectedDigest)) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return send(response, 401, { ok: false });
  }

  try {
    const validUntil = Date.now() + 90_000;
    const token = await issueSignedToken({
      pathname: BLOB_PATHNAME,
      operations: ['get'],
      validUntil
    });
    const { presignedUrl } = await presignUrl(token, {
      pathname: BLOB_PATHNAME,
      operation: 'get',
      access: 'private',
      validUntil
    });
    return send(response, 200, { ok: true, url: presignedUrl });
  } catch {
    return send(response, 503, { ok: false });
  }
}
