import { ADMIN_COOKIE_NAME, HUB_ADMIN_SCOPES, HUB_PUBLIC_SCOPES, PRIVATE_RESOURCES, noStoreHeaders, readCookie, verifyAdminSession, verifySession } from '../../lib/private-access.js';

function send(response, status, body) {
  for (const [name, value] of Object.entries(noStoreHeaders)) response.setHeader(name, value);
  return response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return send(response, 405, { ok: false, admin: false, allowed: [] });
  }

  const cookieHeader = request.headers.cookie;
  const adminToken = readCookie(cookieHeader, ADMIN_COOKIE_NAME);
  const admin = await verifyAdminSession(adminToken, process.env.PRIVATE_ACCESS_ADMIN_SESSION_SECRET);

  if (admin) {
    return send(response, 200, { ok: true, admin: true, allowed: HUB_ADMIN_SCOPES });
  }

  const checks = await Promise.all(HUB_PUBLIC_SCOPES.map(async (scope) => {
    const token = readCookie(cookieHeader, PRIVATE_RESOURCES[scope].cookieName);
    const valid = await verifySession(token, scope, process.env.PRIVATE_ACCESS_SESSION_SECRET);
    return valid ? scope : null;
  }));

  return send(response, 200, { ok: true, admin: false, allowed: checks.filter(Boolean) });
}