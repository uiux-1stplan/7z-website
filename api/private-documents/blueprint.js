import { issueSignedToken, presignUrl } from '@vercel/blob';
import { ADMIN_COOKIE_NAME, PRIVATE_RESOURCES, noStoreHeaders, readCookie, verifyAdminSession, verifySession } from '../../lib/private-access.js';

const BLOB_PATHNAME = 'private/7z-magic-strategic-blueprint-2026-2027-v2-20260814.pdf';
const SIGNED_URL_LIFETIME_MS = 90_000;

function applyHeaders(response, extraHeaders = {}) {
  for (const [name, value] of Object.entries({ ...noStoreHeaders, ...extraHeaders })) response.setHeader(name, value);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    applyHeaders(response);
    return response.status(405).end();
  }

  const adminToken = readCookie(request.headers.cookie, ADMIN_COOKIE_NAME);
  const adminValid = await verifyAdminSession(adminToken, process.env.PRIVATE_ACCESS_ADMIN_SESSION_SECRET);
  const token = readCookie(request.headers.cookie, PRIVATE_RESOURCES['blueprint-pdf'].cookieName);
  const resourceValid = await verifySession(token, 'blueprint-pdf', process.env.PRIVATE_ACCESS_SESSION_SECRET);
  if (!adminValid && !resourceValid) {
    applyHeaders(response);
    return response.status(401).end();
  }

  try {
    const validUntil = Date.now() + SIGNED_URL_LIFETIME_MS;
    const token = await issueSignedToken({ pathname: BLOB_PATHNAME, operations: ['get'], validUntil });
    const { presignedUrl } = await presignUrl(token, { pathname: BLOB_PATHNAME, operation: 'get', access: 'private', validUntil });
    applyHeaders(response, { Location: presignedUrl });
    return response.status(302).end();
  } catch {
    applyHeaders(response);
    return response.status(503).end();
  }
}
