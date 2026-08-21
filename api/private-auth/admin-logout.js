import { adminSessionCookie, noStoreHeaders } from '../../lib/private-access.js';

function send(response, status, body, extraHeaders = {}) {
  for (const [name, value] of Object.entries({ ...noStoreHeaders, ...extraHeaders })) response.setHeader(name, value);
  return response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { ok: false });
  }

  return send(
    response,
    200,
    { ok: true },
    { 'Set-Cookie': adminSessionCookie('', 0) }
  );
}