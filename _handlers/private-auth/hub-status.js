import {
  ADMIN_COOKIE_NAME,
  HUB_ADMIN_SCOPES,
  HUB_PUBLIC_SCOPES,
  PRIVATE_RESOURCES,
  noStoreHeaders,
  readCookie,
  verifyAdminSession,
  verifySession
} from "../../lib/private-access.js";

import {
  getNativeClientSession
} from "../../lib/portal-native-session.mjs";

import {
  getSql
} from "../../lib/portal-runtime.mjs";


function send(response, status, body) {
  for (const [name, value] of Object.entries(noStoreHeaders)) {
    response.setHeader(name, value);
  }

  response.setHeader("Vary", "Cookie");

  return response
    .status(status)
    .json(body);
}


async function liveFilesForKeys(clientKeys) {
  const keys =
    Array.isArray(clientKeys)
      ? clientKeys.map(String).filter(Boolean)
      : [];

  if (!keys.length) {
    return [];
  }

  const keySet =
    new Set(keys);

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
      FROM portal_client_file_permissions p
      INNER JOIN portal_files f
        ON f.id = p.file_id
      WHERE p.can_view = TRUE
      ORDER BY
        f.created_at DESC,
        f.original_name ASC
    `;

  const merged =
    new Map();

  for (const row of rows) {
    if (!keySet.has(String(row.client_key))) {
      continue;
    }

    const id =
      String(row.id);

    const existing =
      merged.get(id);

    if (!existing) {
      merged.set(
        id,
        {
          id,
          name: row.original_name,
          sizeBytes: Number(row.size_bytes || 0),
          contentType:
            row.content_type ||
            "application/octet-stream",
          canView: true,
          canDownload: Boolean(row.can_download)
        }
      );
    } else {
      existing.canDownload =
        existing.canDownload ||
        Boolean(row.can_download);
    }
  }

  return [...merged.values()];
}


async function legacyClientKeys(scopes) {
  if (!Array.isArray(scopes) || !scopes.length) {
    return [];
  }

  const scopeSet =
    new Set(scopes.map(String));

  const sql =
    getSql();

  const rows =
    await sql`
      SELECT
        client_key,
        legacy_scope
      FROM portal_clients
      WHERE
        auth_type = 'legacy_scope'
        AND status = 'active'
    `;

  return rows
    .filter(
      row =>
        scopeSet.has(
          String(row.legacy_scope)
        )
    )
    .map(
      row =>
        String(row.client_key)
    );
}


export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return send(
      response,
      405,
      {
        ok: false,
        authenticated: false,
        admin: false,
        native: false,
        allowed: [],
        files: []
      }
    );
  }

  try {
    const cookieHeader =
      request.headers.cookie || "";

    const adminToken =
      readCookie(
        cookieHeader,
        ADMIN_COOKIE_NAME
      );

    const admin =
      await verifyAdminSession(
        adminToken,
        process.env.PRIVATE_ACCESS_ADMIN_SESSION_SECRET
      );

    if (admin) {
      return send(
        response,
        200,
        {
          ok: true,
          authenticated: true,
          authType: "admin",
          admin: true,
          native: false,
          allowed: HUB_ADMIN_SCOPES,
          files: [],
          source: "hub-status-live-files-v2"
        }
      );
    }

    const nativeClient =
      await getNativeClientSession(
        request
      );

    if (nativeClient?.client_key) {
      const clientKey =
        String(
          nativeClient.client_key
        );

      const files =
        await liveFilesForKeys(
          [clientKey]
        );

      return send(
        response,
        200,
        {
          ok: true,
          authenticated: true,
          authType: "native",
          admin: false,
          native: true,
          allowed: [],
          files,
          client: {
            clientKey,
            username:
              nativeClient.username ||
              null,
            displayName:
              nativeClient.display_name ||
              null
          },
          source: "hub-status-live-files-v2"
        }
      );
    }

    const checks =
      await Promise.all(
        HUB_PUBLIC_SCOPES.map(
          async scope => {
            const resource =
              PRIVATE_RESOURCES[scope];

            const token =
              readCookie(
                cookieHeader,
                resource.cookieName
              );

            if (!token) {
              return null;
            }

            const valid =
              await verifySession(
                token,
                scope,
                process.env.PRIVATE_ACCESS_SESSION_SECRET
              );

            return valid
              ? scope
              : null;
          }
        )
      );

    const allowed =
      checks.filter(Boolean);

    if (!allowed.length) {
      return send(
        response,
        200,
        {
          ok: true,
          authenticated: false,
          authType: null,
          admin: false,
          native: false,
          allowed: [],
          files: [],
          source: "hub-status-live-files-v2"
        }
      );
    }

    const keys =
      await legacyClientKeys(
        allowed
      );

    const files =
      await liveFilesForKeys(
        keys
      );

    return send(
      response,
      200,
      {
        ok: true,
        authenticated: true,
        authType: "legacy",
        admin: false,
        native: false,
        allowed,
        files,
        source: "hub-status-live-files-v2"
      }
    );

  } catch (error) {
    console.error(
      "Hub status + files:",
      error
    );

    return send(
      response,
      500,
      {
        ok: false,
        authenticated: false,
        admin: false,
        native: false,
        allowed: [],
        files: [],
        error:
          "Private access temporarily unavailable."
      }
    );
  }
}
