import {
  Readable
} from "node:stream";

import {
  get
} from "@vercel/blob";

import {
  getSql,
  requireAdmin
} from "../../lib/portal-runtime.mjs";


function toWebRequest(req) {

  const protocol =
    String(
      req.headers?.["x-forwarded-proto"] ||
      "http"
    )
    .split(",")[0]
    .trim();

  const host =
    req.headers?.host ||
    "localhost";

  const headers =
    new Headers();


  for (
    const [key, value]
    of Object.entries(
      req.headers || {}
    )
  ) {

    if (Array.isArray(value)) {

      for (const item of value) {
        headers.append(
          key,
          String(item)
        );
      }

    } else if (
      value !== undefined &&
      value !== null
    ) {

      headers.set(
        key,
        String(value)
      );
    }
  }


  return new Request(
    `${protocol}://${host}${req.url || "/"}`,
    {
      method:
        req.method || "GET",

      headers
    }
  );
}


function safeFilename(value) {

  return String(
    value || "private-file"
  )
    .replace(
      /[\r\n"]/g,
      "_"
    )
    .slice(
      0,
      180
    );
}


export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
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
        error:
          "Method not allowed."
      });
  }


  try {

    await requireAdmin(
      toWebRequest(req)
    );


    const sql =
      getSql();


    const rawId =
      req.query?.id;

    const id =
      Array.isArray(rawId)
        ? String(rawId[0] || "")
        : String(rawId || "");


    /*
     * No ID:
     * return every active uploaded portal file.
     */
    if (!id.trim()) {

      const files =
        await sql`
          SELECT
            id,
            original_name,
            content_type,
            size_bytes,
            created_at,
            is_active

          FROM portal_files

          WHERE is_active = TRUE

          ORDER BY created_at DESC
        `;


      return res
        .status(200)
        .json({
          ok: true,

          files:
            files.map(
              file => ({
                id:
                  String(file.id),

                name:
                  file.original_name,

                contentType:
                  file.content_type ||
                  "application/octet-stream",

                sizeBytes:
                  Number(
                    file.size_bytes || 0
                  ),

                createdAt:
                  file.created_at
              })
            )
        });
    }


    const rows =
      await sql`
        SELECT
          id,
          blob_pathname,
          original_name,
          content_type

        FROM portal_files

        WHERE
          id = ${id.trim()}
          AND is_active = TRUE

        LIMIT 1
      `;


    const file =
      rows[0];


    if (!file) {

      return res
        .status(404)
        .end(
          "File not found."
        );
    }


    /*
     * Official Vercel Blob private delivery.
     */
    const result =
      await get(
        file.blob_pathname,
        {
          access:
            "private",

          useCache:
            false
        }
      );


    if (
      !result ||
      result.statusCode !== 200
    ) {

      return res
        .status(404)
        .end(
          "Stored object not found."
        );
    }


    const filename =
      safeFilename(
        file.original_name
      );


    const encoded =
      encodeURIComponent(
        filename
      );


    const rawMode =
      req.query?.mode;

    const mode =
      Array.isArray(rawMode)
        ? rawMode[0]
        : rawMode;


    const download =
      mode === "download";


    const contentType =
      result.blob?.contentType ||
      file.content_type ||
      "application/octet-stream";


    res.statusCode = 200;


    res.setHeader(
      "Content-Type",
      contentType
    );


    res.setHeader(
      "Content-Disposition",

      download

        ? `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`

        : `inline; filename="${filename}"; filename*=UTF-8''${encoded}`
    );


    /*
     * Active document hardening.
     */
    if (
      contentType.includes(
        "text/html"
      ) ||
      contentType.includes(
        "application/xhtml"
      ) ||
      contentType.includes(
        "image/svg"
      )
    ) {

      res.setHeader(
        "Content-Security-Policy",
        "sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads"
      );
    }


    if (!result.stream) {
      return res.end();
    }


    Readable
      .fromWeb(
        result.stream
      )
      .pipe(res);


  } catch (error) {

    console.error(
      "Admin private file:",
      error
    );


    if (!res.headersSent) {

      const status =
        Number(
          error?.status ||
          error?.statusCode ||
          401
        );


      return res
        .status(
          status === 403
            ? 403
            : status === 404
              ? 404
              : 401
        )
        .json({
          ok: false,
          error:
            "Administrator authorization required."
        });
    }


    res.end();
  }
}
