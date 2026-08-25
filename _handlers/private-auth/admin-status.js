import { ADMIN_COOKIE_NAME, noStoreHeaders, readCookie, verifyAdminSession } from '../../lib/private-access.js';

function send(response, status, body) {
  for (const [name, value] of Object.entries(noStoreHeaders)) response.setHeader(name, value);
  return response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return send(response, 405, { ok: false, authenticated: false });
  }

  const token = readCookie(request.headers.cookie, ADMIN_COOKIE_NAME);
  const authenticated = await verifyAdminSession(token, process.env.PRIVATE_ACCESS_ADMIN_SESSION_SECRET);

  return send(response, 200, { ok: true, authenticated });
}