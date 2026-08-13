const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_MAX_AGE_SECONDS = 6 * 60 * 60;

export const PRIVATE_RESOURCES = Object.freeze({
  silla: Object.freeze({
    cookieName: '__Host-7z_silla_session',
    clientIdEnv: 'PRIVATE_ACCESS_SILLA_CLIENT_ID',
    accessKeyEnv: 'PRIVATE_ACCESS_SILLA_ACCESS_KEY',
    paths: Object.freeze(['/silla-hall-presentation'])
  }),
  elcon: Object.freeze({
    cookieName: '__Host-7z_elcon_session',
    clientIdEnv: 'PRIVATE_ACCESS_ELCON_CLIENT_ID',
    accessKeyEnv: 'PRIVATE_ACCESS_ELCON_ACCESS_KEY',
    paths: Object.freeze(['/elcon-arabia-presentation'])
  }),
  blueprint: Object.freeze({
    cookieName: '__Host-7z_blueprint_session',
    clientIdEnv: 'PRIVATE_ACCESS_BLUEPRINT_CLIENT_ID',
    accessKeyEnv: 'PRIVATE_ACCESS_BLUEPRINT_ACCESS_KEY',
    paths: Object.freeze(['/strategic-blueprint', '/api/private-documents/blueprint'])
  })
});

export function isResource(value) {
  return typeof value === 'string' && Object.hasOwn(PRIVATE_RESOURCES, value);
}

export function scopeForPath(pathname) {
  if (typeof pathname !== 'string') return null;
  for (const [scope, resource] of Object.entries(PRIVATE_RESOURCES)) {
    if (resource.paths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return scope;
    }
  }
  return null;
}

export function safeNextPath(scope, candidate) {
  if (!isResource(scope) || typeof candidate !== 'string' || candidate.length < 1 || candidate.length > 2048) return null;
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\') || /[\u0000-\u001f\u007f]/.test(candidate)) return null;

  try {
    const base = 'https://private-access.invalid';
    const url = new URL(candidate, base);
    if (url.origin !== base || scopeForPath(url.pathname) !== scope) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function toBase64Url(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret) {
  if (typeof secret !== 'string' || secret.length < 32) return null;
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function randomId() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function issueSession(scope, secret, now = Date.now()) {
  if (!isResource(scope)) return null;
  const key = await hmacKey(secret);
  if (!key) return null;
  const issuedAt = Math.floor(now / 1000);
  const payload = { r: scope, i: issuedAt, e: issuedAt + SESSION_MAX_AGE_SECONDS, j: randomId() };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload)));
  return `${encodedPayload}.${toBase64Url(signature)}`;
}

export async function verifySession(token, expectedScope, secret, now = Date.now()) {
  if (!isResource(expectedScope) || typeof token !== 'string' || token.length > 1024) return false;
  const [encodedPayload, encodedSignature, ...extra] = token.split('.');
  if (extra.length || !encodedPayload || !encodedSignature) return false;
  const signature = fromBase64Url(encodedSignature);
  const payloadBytes = fromBase64Url(encodedPayload);
  const key = await hmacKey(secret);
  if (!signature || !payloadBytes || !key) return false;

  const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(encodedPayload));
  if (!valid) return false;

  try {
    const payload = JSON.parse(decoder.decode(payloadBytes));
    const nowSeconds = Math.floor(now / 1000);
    return payload && payload.r === expectedScope && Number.isInteger(payload.i) && Number.isInteger(payload.e)
      && typeof payload.j === 'string' && /^[A-Za-z0-9_-]{24}$/.test(payload.j)
      && payload.i <= nowSeconds + 60 && payload.e > nowSeconds && payload.e - payload.i === SESSION_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}

export function readCookie(cookieHeader, name) {
  if (typeof cookieHeader !== 'string') return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

export function sessionCookie(scope, value, maxAge = SESSION_MAX_AGE_SECONDS) {
  if (!isResource(scope)) return null;
  const age = Number.isInteger(maxAge) && maxAge >= 0 ? maxAge : 0;
  return `${PRIVATE_RESOURCES[scope].cookieName}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export async function constantTimeEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([digest(String(left)), digest(String(right))]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) difference |= leftDigest[index] ^ rightDigest[index];
  return difference === 0;
}

export async function validCredentials(scope, clientId, accessKey, environment) {
  if (!isResource(scope) || typeof clientId !== 'string' || typeof accessKey !== 'string') return false;
  const resource = PRIVATE_RESOURCES[scope];
  const expectedClientId = environment?.[resource.clientIdEnv];
  const expectedAccessKey = environment?.[resource.accessKeyEnv];
  if (typeof expectedClientId !== 'string' || typeof expectedAccessKey !== 'string' || !expectedClientId || !expectedAccessKey) return false;
  const [clientMatches, keyMatches] = await Promise.all([
    constantTimeEqual(clientId, expectedClientId),
    constantTimeEqual(accessKey, expectedAccessKey)
  ]);
  return clientMatches && keyMatches;
}

export const noStoreHeaders = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff'
});
