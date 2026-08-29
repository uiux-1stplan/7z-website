import crypto from "node:crypto";

import {
  getSql
} from "./portal-runtime.mjs";


export const CLIENT_IDENTITY_COOKIE =
  "z7_client_identity";

const IDENTITY_SECONDS =
  24 * 60 * 60;


function requestIsSecure(request) {

  const proto =
    String(
      request?.headers?.["x-forwarded-proto"] || ""
    )
      .split(",")[0]
      .trim()
      .toLowerCase();

  const host =
    String(
      request?.headers?.host || ""
    )
      .trim()
      .toLowerCase();

  if (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1")
  ) {
    return false;
  }

  return (
    proto === "https" ||
    process.env.VERCEL_ENV === "production"
  );
}


function signingSecret() {

  const secret =
    process.env.PRIVATE_ACCESS_SESSION_SECRET;

  if (
    typeof secret !== "string" ||
    secret.length < 32
  ) {
    throw new Error(
      "PRIVATE_ACCESS_SESSION_SECRET is unavailable."
    );
  }

  return secret;
}


function parseCookies(header = "") {

  const cookies = {};

  for (
    const part
    of String(header).split(";")
  ) {

    const separator =
      part.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const name =
      part
        .slice(0, separator)
        .trim();

    const raw =
      part
        .slice(separator + 1)
        .trim();

    try {
      cookies[name] =
        decodeURIComponent(raw);
    } catch {
      cookies[name] =
        raw;
    }
  }

  return cookies;
}


function hmac(value) {

  return crypto
    .createHmac(
      "sha256",
      signingSecret()
    )
    .update(
      String(value)
    )
    .digest(
      "base64url"
    );
}


export function issueClientIdentityCookie(
  request,
  clientKey
) {

  const now =
    Math.floor(
      Date.now() / 1000
    );

  const payload =
    Buffer
      .from(
        JSON.stringify({
          k:
            String(clientKey),
          i:
            now,
          e:
            now + IDENTITY_SECONDS
        }),
        "utf8"
      )
      .toString(
        "base64url"
      );

  const signature =
    hmac(payload);

  const parts = [
    `${CLIENT_IDENTITY_COOKIE}=${payload}.${signature}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${IDENTITY_SECONDS}`
  ];

  if (
    requestIsSecure(request)
  ) {
    parts.push(
      "Secure"
    );
  }

  return parts.join(
    "; "
  );
}


export function clearClientIdentityCookie(
  request
) {

  const parts = [
    `${CLIENT_IDENTITY_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (
    requestIsSecure(request)
  ) {
    parts.push(
      "Secure"
    );
  }

  return parts.join(
    "; "
  );
}


export function verifyClientIdentity(
  request
) {

  try {

    const cookies =
      parseCookies(
        request?.headers?.cookie || ""
      );

    const token =
      cookies[
        CLIENT_IDENTITY_COOKIE
      ];

    if (
      !token ||
      token.length > 2048
    ) {
      return null;
    }

    const pieces =
      token.split(".");

    if (
      pieces.length !== 2
    ) {
      return null;
    }

    const [
      payload,
      suppliedSignature
    ] =
      pieces;

    const expectedSignature =
      hmac(payload);

    const supplied =
      Buffer.from(
        suppliedSignature
      );

    const expected =
      Buffer.from(
        expectedSignature
      );

    if (
      supplied.length !==
      expected.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        supplied,
        expected
      )
    ) {
      return null;
    }

    const parsed =
      JSON.parse(
        Buffer
          .from(
            payload,
            "base64url"
          )
          .toString(
            "utf8"
          )
      );

    const now =
      Math.floor(
        Date.now() / 1000
      );

    if (
      !parsed ||
      typeof parsed.k !==
        "string" ||
      !parsed.k ||
      !Number.isInteger(
        parsed.i
      ) ||
      !Number.isInteger(
        parsed.e
      ) ||
      parsed.i >
        now + 60 ||
      parsed.e <=
        now ||
      parsed.e - parsed.i !==
        IDENTITY_SECONDS
    ) {
      return null;
    }

    return {
      clientKey:
        parsed.k
    };

  } catch {
    return null;
  }
}


export async function getActiveClientByKey(
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
        username,
        auth_type,
        status

      FROM portal_clients

      WHERE
        client_key =
          ${String(clientKey)}

        AND status =
          'active'

      LIMIT 1
    `;

  return rows[0] || null;
}


export async function getFilesForClientKeys(
  clientKeys
) {

  const keys =
    Array.isArray(
      clientKeys
    )
      ? clientKeys
          .map(
            String
          )
          .filter(
            Boolean
          )
      : [];

  if (
    !keys.length
  ) {
    return [];
  }

  const keySet =
    new Set(
      keys
    );

  const sql =
    getSql();

  const rows =
    await sql`
      SELECT
        p.client_key,
        p.file_id,
        p.can_view,
        p.can_download,

        f.id,
        f.original_name,
        f.size_bytes,
        f.content_type,
        f.created_at

      FROM
        portal_client_file_permissions p

      INNER JOIN
        portal_files f

        ON
          f.id =
            p.file_id

      WHERE
        p.can_view =
          TRUE

      ORDER BY
        f.created_at DESC,
        f.original_name ASC
    `;

  const merged =
    new Map();

  for (
    const row
    of rows
  ) {

    if (
      !keySet.has(
        String(
          row.client_key
        )
      )
    ) {
      continue;
    }

    const id =
      String(
        row.id
      );

    const existing =
      merged.get(id);

    if (
      !existing
    ) {

      merged.set(
        id,
        {
          id,

          name:
            row.original_name,

          sizeBytes:
            Number(
              row.size_bytes || 0
            ),

          contentType:
            row.content_type ||
            "application/octet-stream",

          canView:
            true,

          canDownload:
            Boolean(
              row.can_download
            )
        }
      );

    } else {

      existing.canDownload =
        existing.canDownload ||
        Boolean(
          row.can_download
        );
    }
  }

  return [
    ...merged.values()
  ];
}


export async function getLegacyClientKeys(
  scopes
) {

  if (
    !Array.isArray(
      scopes
    ) ||
    !scopes.length
  ) {
    return [];
  }

  const scopeSet =
    new Set(
      scopes.map(
        String
      )
    );

  const sql =
    getSql();

  const rows =
    await sql`
      SELECT
        client_key,
        legacy_scope

      FROM portal_clients

      WHERE
        auth_type =
          'legacy_scope'

        AND status =
          'active'
    `;

  return rows
    .filter(
      row =>
        scopeSet.has(
          String(
            row.legacy_scope
          )
        )
    )
    .map(
      row =>
        String(
          row.client_key
        )
    );
}
