import {
  Readable
} from "node:stream";

import {
  head
} from "@vercel/blob";

import {
  getLegacyClientScopes
} from "../../lib/portal-legacy-access.mjs";

import {
  getNativeClientSession
} from "../../lib/portal-native-session.mjs";

import {
  getActiveClientByKey,
  getLegacyClientKeys,
  verifyClientIdentity
} from "../../lib/portal-client-delivery.mjs";

import {
  getSql
} from "../../lib/portal-runtime.mjs";

import {
  applyPrivateNoStore
} from "../../lib/portal-legacy-access.mjs";


function safeFilename(
  value
) {

  return String(
    value ||
    "private-file"
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


async function clientKeys(
  request
) {

  const identity =
    verifyClientIdentity(
      request
    );


  if (
    identity?.clientKey
  ) {

    const client =
      await getActiveClientByKey(
        identity.clientKey
      );


    if (
      client?.auth_type ===
        "native"
    ) {

      return [
        String(
          client.client_key
        )
      ];
    }
  }


  const nativeClient =
    await getNativeClientSession(
      request
    );


  if (
    nativeClient?.client_key
  ) {

    return [
      String(
        nativeClient.client_key
      )
    ];
  }


  const legacyScopes =
    await getLegacyClientScopes(
      request
    );


  return getLegacyClientKeys(
    legacyScopes
  );
}


export default async function handler(
  req,
  res
) {

  applyPrivateNoStore(
    res
  );


  res.setHeader(
    "Vary",
    "Cookie"
  );


  if (
    req.method !==
    "GET"
  ) {

    res.setHeader(
      "Allow",
      "GET"
    );

    return res
      .status(405)
      .end();
  }


  try {

    const keys =
      await clientKeys(
        req
      );


    if (
      !keys.length
    ) {

      return res
        .status(401)
        .end(
          "Unauthorized"
        );
    }


    const rawId =
      Array.isArray(
        req.query?.id
      )
        ? req.query.id[0]
        : req.query?.id;


    const id =
      String(
        rawId || ""
      )
        .trim();


    const rawMode =
      Array.isArray(
        req.query?.mode
      )
        ? req.query.mode[0]
        : req.query?.mode;


    const mode =
      rawMode ===
        "download"
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
        keys.map(
          String
        )
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

        FROM
          portal_client_file_permissions p

        INNER JOIN
          portal_files f

          ON
            f.id =
              p.file_id

        WHERE
          f.id::text =
            ${id}
      `;


    const matching =
      rows.filter(
        row =>
          keySet.has(
            String(
              row.client_key
            )
          )
      );


    if (
      !matching.length
    ) {

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
      mode ===
        "download" &&
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


    if (
      !blob?.url
    ) {

      return res
        .status(404)
        .end(
          "Blob not found"
        );
    }


    const token =
      process.env
        .BLOB_READ_WRITE_TOKEN;


    if (
      !token
    ) {

      return res
        .status(503)
        .end(
          "Storage unavailable"
        );
    }


    const headers = {
      Authorization:
        `Bearer ${token}`
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
          cache:
            "no-store"
        }
      );


    if (
      !upstream.ok &&
      upstream.status !==
        206
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


      if (
        value
      ) {

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


    if (
      !upstream.body
    ) {

      return res.end();
    }


    Readable
      .fromWeb(
        upstream.body
      )
      .pipe(
        res
      );


  } catch (error) {

    console.error(
      "Private file:",
      error
    );


    if (
      !res.headersSent
    ) {

      return res
        .status(500)
        .end(
          "Private file temporarily unavailable"
        );
    }


    res.end();
  }
}
