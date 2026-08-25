import {
  resolvePortalClientAccess
} from "../../lib/portal-client-access.mjs";

import {
  applyPrivateNoStore
} from "../../lib/portal-legacy-access.mjs";


export default async function handler(
  req,
  res
) {

  applyPrivateNoStore(res);


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
      await resolvePortalClientAccess(
        req
      );


    if (!access.authenticated) {

      return res
        .status(401)
        .json({
          ok: false,
          authenticated: false,
          files: []
        });
    }


    const runtime =
      await import(
        "../../lib/portal-runtime.mjs"
      );

    const sql =
      runtime.getSql();

    const allowedKeys =
      new Set(
        access.clientKeys
      );


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

        JOIN portal_files f
          ON f.id =
             p.file_id

        WHERE
          p.can_view = TRUE
          AND f.is_active = TRUE

        ORDER BY
          f.created_at DESC
      `;


    const merged =
      new Map();


    for (
      const row
      of rows
    ) {

      if (
        !allowedKeys.has(
          row.client_key
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


      if (!existing) {

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
              Boolean(
                row.can_view
              ),

            canDownload:
              Boolean(
                row.can_download
              )
          }
        );

      } else {

        existing.canView =
          existing.canView ||
          Boolean(
            row.can_view
          );

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

        authType:
          access.authType,

        files:
          [...merged.values()]
      });


  } catch (error) {

    console.error(
      "Unified portal files:",
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
