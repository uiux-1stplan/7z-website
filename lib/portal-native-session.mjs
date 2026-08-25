import crypto from "node:crypto";

import {
  verifyPortalPassword,
  normalizeClientId
} from "./portal-client-auth.mjs";

import {
  getSql
} from "./portal-runtime.mjs";


export const PORTAL_CLIENT_COOKIE =
  "z7_portal_client_session";

const SESSION_SECONDS =
  24 * 60 * 60;


function parseCookies(header = "") {

  const cookies = {};

  for (const part of String(header).split(";")) {

    const index = part.indexOf("=");

    if (index <= 0) continue;

    const key =
      part.slice(0, index).trim();

    const value =
      part.slice(index + 1).trim();

    try {
      cookies[key] =
        decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}


function tokenHash(token) {

  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}


function secureRequest(request) {

  const forwarded =
    String(
      request.headers?.["x-forwarded-proto"] || ""
    ).toLowerCase();

  const host =
    String(
      request.headers?.host || ""
    ).toLowerCase();

  if (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1")
  ) {
    return false;
  }

  return (
    forwarded === "https" ||
    process.env.VERCEL_ENV === "production"
  );
}


function sessionCookie(
  request,
  token
) {

  const parts = [
    `${PORTAL_CLIENT_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_SECONDS}`
  ];

  if (secureRequest(request)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}


export function clearPortalClientCookie(
  request
) {

  const parts = [
    `${PORTAL_CLIENT_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (secureRequest(request)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}


export async function createPortalClientSession(
  request,
  clientKey
) {

  const sql =
    getSql();

  const rows =
    await sql`
      SELECT
        client_key,
        display_name,
        company,
        auth_type,
        legacy_scope,
        username,
        status

      FROM portal_clients

      WHERE
        client_key = ${clientKey}
        AND status = 'active'

      LIMIT 1
    `;

  const client =
    rows[0];

  if (!client) {
    return {
      ok: false
    };
  }


  const token =
    crypto
      .randomBytes(32)
      .toString("base64url");

  const hash =
    tokenHash(token);

  const expiresAt =
    new Date(
      Date.now() +
      SESSION_SECONDS * 1000
    ).toISOString();


  await sql`
    DELETE FROM portal_client_sessions
    WHERE expires_at <= NOW()
  `;


  await sql`
    INSERT INTO portal_client_sessions (
      token_hash,
      client_key,
      expires_at,
      created_at,
      last_seen_at
    )

    VALUES (
      ${hash},
      ${client.client_key},
      ${expiresAt},
      NOW(),
      NOW()
    )
  `;


  return {
    ok: true,

    client,

    cookie:
      sessionCookie(
        request,
        token
      )
  };
}


export async function tryNativeClientLogin(
  request,
  clientId,
  password
) {

  const username =
    normalizeClientId(
      clientId
    );

  if (
    !username ||
    typeof password !== "string"
  ) {
    return {
      ok: false
    };
  }


  const sql =
    getSql();


  const rows =
    await sql`
      SELECT
        client_key,
        password_hash,
        status

      FROM portal_clients

      WHERE
        auth_type = 'native'
        AND LOWER(username) = ${username}

      LIMIT 1
    `;


  const client =
    rows[0];


  if (
    !client ||
    client.status !== "active" ||
    !client.password_hash
  ) {
    return {
      ok: false
    };
  }


  const valid =
    await verifyPortalPassword(
      password,
      client.password_hash
    );


  if (!valid) {
    return {
      ok: false
    };
  }


  return createPortalClientSession(
    request,
    client.client_key
  );
}


export async function getPortalClientSession(
  request
) {

  const cookies =
    parseCookies(
      request.headers?.cookie || ""
    );


  const token =
    cookies[
      PORTAL_CLIENT_COOKIE
    ];


  if (!token) {
    return null;
  }


  const hash =
    tokenHash(token);

  const sql =
    getSql();


  const rows =
    await sql`
      SELECT
        c.client_key,
        c.display_name,
        c.company,
        c.auth_type,
        c.legacy_scope,
        c.username,
        c.status,
        s.expires_at

      FROM portal_client_sessions s

      JOIN portal_clients c
        ON c.client_key =
           s.client_key

      WHERE
        s.token_hash = ${hash}
        AND s.expires_at > NOW()
        AND c.status = 'active'

      LIMIT 1
    `;


  const client =
    rows[0];


  if (!client) {
    return null;
  }


  await sql`
    UPDATE portal_client_sessions

    SET
      last_seen_at = NOW()

    WHERE
      token_hash = ${hash}
  `;


  return client;
}


/*
 * Backward compatibility for code which still
 * asks specifically for a Native session.
 */
export async function getNativeClientSession(
  request
) {

  const client =
    await getPortalClientSession(
      request
    );

  if (
    !client ||
    client.auth_type !== "native"
  ) {
    return null;
  }

  return client;
}
