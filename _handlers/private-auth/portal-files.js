import {
  getNativeClientSession
} from "../../lib/portal-native-session.mjs";

import {
  resolvePortalClientAccess
} from "../../lib/portal-client-access.mjs";

import {
  applyPrivateNoStore
} from "../../lib/portal-legacy-access.mjs";

import {
  getSql
} from "../../lib/portal-runtime.mjs";


async function resolveKeys(req) {

  const nativeClient =
    await getNativeClientSession(req);

  if (nativeClient?.client_key) {

    return {
      authenticated: true,
      authType: "native",
      clientKeys: [
        String(nativeClient.client_key)
      ]
    };
  }

  const access =
    await resolvePortalClientAccess(req);

  return {
    authenticated:
      Boolean(access?.authenticated),

    authType:
      access?.authType || null,

    clientKeys:
      Array.isArray(access?.clientKeys)
        ? access.clientKeys.map(String)
        : []
  };
}


export default async function handler(
  req,
  res
) {

  applyPrivateNoStore(res);

  res.setHeader(
    "Vary",
    "Cookie"
  );

  if (req.method !== "GET") {

    res.setHeader(
      "Allow",
      "GET"
    );

    return res
      .status(405)
      .json({
        ok: false,
        authenticated: false,
        files: []
      });
  }

  try {

    const access =
      await resolveKeys(req);

    if (
      !access.authenticated ||
      !access.clientKeys.length
    ) {

      return res
        .status(401)
        .json({
          ok: false,
          authenticated: false,
          files: []
        });
    }

    const keySet =
      new Set(
        access.clientKeys
      );

    const sql =
      getSql();

    /*
     * IMPORTANT:
     * portal_client_file_permissions is the source of truth.
     * If can_view = TRUE, the client sees the file.
     */
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

    const files =
      new Map();

    for (const row of rows) {

      if (
        !keySet.has(
          String(row.client_key)
        )
      ) {
        continue;
      }

      const id =
        String(row.id);

      const existing =
        files.get(id);

      if (!existing) {

        files.set(
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

    return res
      .status(200)
      .json({
        ok: true,
        authenticated: true,
        authType: access.authType,
        files: [...files.values()],
        version: "20260825-final-client-files"
      });

  } catch (error) {

    console.error(
      "Final portal files:",
      error
    );

    return res
      .status(500)
      .json({
        ok: false,
        authenticated: false,
        files: [],
        error:
          "Private files temporarily unavailable."
      });
  }
}