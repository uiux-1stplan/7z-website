import crypto from "node:crypto";

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret || typeof secret !== "string" || secret.trim().length === 0) {
    return null;
  }
  return secret.trim();
}

/**
 * Creates a short-lived HMAC signed ticket for viewing a file.
 * Fails closed if no server secret environment variable is configured.
 * @param {string} fileId
 * @param {number} ttlSeconds - Default 5 minutes (300 seconds)
 * @returns {string}
 */
export function createViewTicket(fileId, ttlSeconds = 300) {
  const secret = getSecret();
  if (!secret || !fileId) {
    throw new Error(
      "Server secret unconfigured or invalid fileId for view ticket generation."
    );
  }
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileId}:${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${expiresAt}.${hmac}`;
}

/**
 * Verifies a view ticket for a specific fileId.
 * Fails closed if no server secret environment variable is configured.
 * @param {string} fileId
 * @param {string} ticket
 * @returns {boolean}
 */
export function verifyViewTicket(fileId, ticket) {
  const secret = getSecret();
  if (!secret || !fileId || !ticket || typeof ticket !== "string") {
    return false;
  }
  const parts = ticket.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [expStr, signature] = parts;
  const expiresAt = parseInt(expStr, 10);
  if (isNaN(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${fileId}:${expiresAt}`;
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}
