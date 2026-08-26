import {
  Readable
} from "node:stream";

import {
  head
} from "@vercel/blob";

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


function safeFilename(name) {

  return String(
    name || "private-file"
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


async function resolveKeys(req) {

  const nativeClient =
    await getNativeClientSession(req);

  if (nativeClient?.client_key) {

    return {
      authenticated: true,
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
      .end();
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
        .end(
          "Unauthorized"
        );
    }

    const rawId =
      Array.isArray(req.query?.id)
        ? req.query.id[0]
        : req.query?.id;

    const id =
      String(
        rawId || ""
      ).trim();

    const rawMode =
      Array.isArray(req.query?.mode)
        ? req.query.mode[0]
        : req.query?.mode;

    const mode =
      rawMode === "download"
        ? "download"
        : "view";

    if (
      !id ||
      id.length > 200
    ) {

      return res
        .status(400)
        .end(
          "Invalid file"
        );
    }

    const keySet =
      new Set(
        access.clientKeys
      );

    const sql =
      getSql();

    const rows =
      await sql`
        SELECT
          p.client_key,
          p.can_view,
          p.can_download,

          f.id,
          f.blob_pathname,
          f.original_name,
          f.content_type

        FROM portal_client_file_permissions p

        INNER JOIN portal_files f
          ON f.id = p.file_id

        WHERE f.id::text = ${id}
      `;

    const matching =
      rows.filter(
        row =>
          keySet.has(
            String(row.client_key)
          )
      );

    if (!matching.length) {

      return res
        .status(404)
        .end(
          "File not available"
        );
    }

    const canView =
      matching.some(
        row =>
          Boolean(
            row.can_view
          )
      );

    const canDownload =
      matching.some(
        row =>
          Boolean(
            row.can_download
          )
      );

    if (
      mode === "view" &&
      !canView
    ) {

      return res
        .status(403)
        .end(
          "View permission denied"
        );
    }

    if (
      mode === "download" &&
      !canDownload
    ) {

      return res
        .status(403)
        .end(
          "Download permission denied"
        );
    }

    const file =
      matching[0];

    const blob =
      await head(
        file.blob_pathname
      );

    if (!blob?.url) {

      return res
        .status(404)
        .end(
          "Blob not found"
        );
    }

    const blobToken =
      process.env
        .BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {

      return res
        .status(503)
        .end(
          "Storage unavailable"
        );
    }

    const headers = {
      Authorization:
        `Bearer ${blobToken}`
    };

    if (
      typeof req.headers.range ===
      "string"
    ) {

      headers.Range =
        req.headers.range;
    }

    const upstream =
      await fetch(
        blob.url,
        {
          headers,
          cache: "no-store"
        }
      );

    if (
      !upstream.ok &&
      upstream.status !== 206
    ) {

      return res
        .status(
          upstream.status
        )
        .end(
          "Private file unavailable"
        );
    }

    res.statusCode =
      upstream.status;

    for (
      const name
      of [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "etag",
        "last-modified"
      ]
    ) {

      const value =
        upstream.headers.get(
          name
        );

      if (value) {

        res.setHeader(
          name,
          value
        );
      }
    }

    if (
      !upstream.headers.get(
        "content-type"
      )
    ) {

      res.setHeader(
        "Content-Type",
        file.content_type ||
        "application/octet-stream"
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

    res.setHeader(
      "Content-Disposition",

      mode === "download"

        ? `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`

        : `inline; filename="${filename}"; filename*=UTF-8''${encoded}`
    );

    if (!upstream.body) {
      return res.end();
    }

    Readable
      .fromWeb(
        upstream.body
      )
      .pipe(res);

  } catch (error) {

    console.error(
      "Final portal file:",
      error
    );

    if (!res.headersSent) {

      return res
        .status(500)
        .end(
          "Private file temporarily unavailable"
        );
    }

    res.end();
  }
}