import crypto from "node:crypto";

function getSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "7z-magic-viewer-ticket-secret-v1"
  );
}

/**
 * Creates a short-lived HMAC signed ticket for viewing a file.
 * @param {string} fileId
 * @param {number} ttlSeconds - Default 1 hour (3600 seconds)
 * @returns {string}
 */
export function createViewTicket(fileId, ttlSeconds = 3600) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileId}:${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${expiresAt}.${hmac}`;
}

/**
 * Verifies a view ticket for a specific fileId.
 * @param {string} fileId
 * @param {string} ticket
 * @returns {boolean}
 */
export function verifyViewTicket(fileId, ticket) {
  if (!ticket || typeof ticket !== "string") {
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
    .createHmac("sha256", getSecret())
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
