import crypto from "node:crypto";
import {
  head,
  del
} from "@vercel/blob";

export default async function handler(
  req,
  res
) {

  const runtime =
    await import(
      "../../lib/portal-runtime.mjs"
    );

  const http =
    await import(
      "../../lib/vercel-api.mjs"
    );

  const { z } =
    await import("zod");

  try {

    if (req.method !== "POST") {

      return http.methodNotAllowed(
        res,
        ["POST"]
      );
    }

    const gate =
      await runtime.requireAdmin(
        http.toWebRequest(req)
      );

    if (!gate.ok) {

      return http.sendWebResponse(
        res,
        gate.response
      );
    }

    const schema =
      z.object({

        pathname:
          z.string()
            .min(8)
            .max(500),

        originalName:
          z.string()
            .min(1)
            .max(500),

        size:
          z.number()
            .nonnegative()
            .optional(),

        contentType:
          z.string()
            .max(255)
            .optional()
            .nullable(),

        url:
          z.string()
            .url()
            .optional()
      });

    const parsed =
      schema.safeParse(
        await http.readJson(req)
      );

    if (!parsed.success) {

      return http.validationError(
        res,
        parsed
      );
    }

    const {
      pathname,
      originalName
    } = parsed.data;

    if (
      !pathname.startsWith(
        "portal/"
      ) ||
      pathname.includes("..") ||
      pathname.includes("\\")
    ) {

      return http.sendJson(
        res,
        400,
        {
          error:
            "Invalid private file pathname."
        }
      );
    }

    /*
     * Verify file actually exists in Blob.
     */
    let blob;

    try {

      blob =
        await head(
          pathname
        );

    } catch (error) {

      console.error(
        "Blob head failed:",
        error
      );

      return http.sendJson(
        res,
        400,
        {
          error:
            "Uploaded Blob could not be verified."
        }
      );
    }

    /*
     * SECURITY:
     * Never register a public Blob as a
     * private client document.
     */
    if (
      !String(
        blob.url || ""
      ).includes(
        ".private.blob.vercel-storage.com"
      )
    ) {

      try {
        await del(pathname);
      } catch {}

      return http.sendJson(
        res,
        400,
        {
          error:
            "The connected Blob store is PUBLIC. A private Blob store is required."
        }
      );
    }

    const sql =
      runtime.getSql();

    /*
     * Read real portal_files schema.
     */
    const columns =
      await sql`
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE
          table_schema = 'public'
          AND table_name = 'portal_files'
        ORDER BY ordinal_position
      `;

    const columnMap =
      new Map(
        columns.map(
          c => [
            c.column_name,
            c
          ]
        )
      );

    const values = {};

    /*
     * Only populate columns that actually exist.
     */
    if (
      columnMap.has("blob_pathname")
    ) {
      values.blob_pathname =
        blob.pathname;
    }

    if (
      columnMap.has("original_name")
    ) {
      values.original_name =
        originalName;
    }

    if (
      columnMap.has("size_bytes")
    ) {
      values.size_bytes =
        Number(
          blob.size ??
          parsed.data.size ??
          0
        );
    }

    if (
      columnMap.has("uploaded_by")
    ) {
      values.uploaded_by =
        gate.auth.userId;
    }

    if (
      columnMap.has("is_active")
    ) {
      values.is_active =
        true;
    }

    if (
      columnMap.has("content_type")
    ) {
      values.content_type =
        blob.contentType ||
        parsed.data.contentType ||
        "application/octet-stream";
    }

    if (
      columnMap.has("blob_url")
    ) {
      values.blob_url =
        blob.url;
    }

    if (
      columnMap.has("download_url")
    ) {
      values.download_url =
        blob.downloadUrl ||
        null;
    }

    /*
     * Support schema if id does not have
     * a Postgres default.
     */
    const idColumn =
      columnMap.get("id");

    if (
      idColumn &&
      !idColumn.column_default
    ) {

      if (
        idColumn.udt_name ===
        "uuid"
      ) {

        values.id =
          crypto.randomUUID();

      } else if (
        idColumn.udt_name ===
        "text" ||
        idColumn.udt_name ===
        "varchar"
      ) {

        values.id =
          crypto.randomUUID();
      }
    }

    /*
     * Ensure we are satisfying any required
     * column that lacks a DB default.
     */
    const requiredMissing =
      columns.filter(column => {

        if (
          column.is_nullable !==
          "NO"
        ) {
          return false;
        }

        if (
          column.column_default
        ) {
          return false;
        }

        if (
          Object.prototype.hasOwnProperty.call(
            values,
            column.column_name
          )
        ) {
          return false;
        }

        /*
         * timestamps may be managed by trigger
         * in some schemas; don't fake them.
         */
        return ![
          "created_at",
          "updated_at"
        ].includes(
          column.column_name
        );
      });

    if (
      requiredMissing.length
    ) {

      throw new Error(
        "Unsupported required portal_files columns: " +
        requiredMissing
          .map(
            x => x.column_name
          )
          .join(", ")
      );
    }

    const names =
      Object.keys(values);

    if (
      !names.includes(
        "blob_pathname"
      ) ||
      !names.includes(
        "original_name"
      )
    ) {

      throw new Error(
        "portal_files schema is missing required Blob metadata columns."
      );
    }

    /*
     * Identifiers come only from the inspected
     * database schema / fixed whitelist above.
     */
    const quoteIdentifier =
      name =>
        `"${String(name)
          .replaceAll(
            '"',
            '""'
          )}"`;

    const placeholders =
      names.map(
        (_, index) =>
          `$${index + 1}`
      );

    const parameters =
      names.map(
        name =>
          values[name]
      );

    const updateParts = [];

    for (
      const name of names
    ) {

      if (
        [
          "id",
          "blob_pathname",
          "uploaded_by"
        ].includes(name)
      ) {
        continue;
      }

      updateParts.push(
        `${quoteIdentifier(name)} = EXCLUDED.${quoteIdentifier(name)}`
      );
    }

    if (
      columnMap.has(
        "updated_at"
      )
    ) {

      updateParts.push(
        `"updated_at" = NOW()`
      );
    }

    const query = `
      INSERT INTO portal_files (
        ${names
          .map(
            quoteIdentifier
          )
          .join(", ")}
      )

      VALUES (
        ${placeholders.join(", ")}
      )

      ON CONFLICT (blob_pathname)

      DO UPDATE SET
        ${updateParts.join(", ")}

      RETURNING *
    `;

    const rows =
      await sql.query(
        query,
        parameters
      );

    const file =
      rows[0];

    await runtime.writeAudit({

      actorUserId:
        gate.auth.userId,

      action:
        "PRIVATE_FILE_UPLOADED",

      targetType:
        "file",

      targetId:
        String(
          file?.id ||
          blob.pathname
        ),

      details: {
        originalName,
        pathname:
          blob.pathname,
        sizeBytes:
          Number(
            blob.size || 0
          ),
        contentType:
          blob.contentType ||
          null
      }
    });

    return http.sendJson(
      res,
      201,
      {
        ok: true,
        file
      }
    );

  } catch (error) {

    console.error(
      "blob-finalize:",
      error
    );

    return http.sendJson(
      res,
      500,
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not register private file."
      }
    );
  }
}
