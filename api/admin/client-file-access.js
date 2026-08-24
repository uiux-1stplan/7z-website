export default async function handler(req, res) {
  const runtime = await import("../../lib/portal-runtime.mjs");
  const http = await import("../../lib/vercel-api.mjs");
  const { z } = await import("zod");

  try {
    const gate = await runtime.requireAdmin(
      http.toWebRequest(req)
    );

    if (!gate.ok) {
      return http.sendWebResponse(res, gate.response);
    }

    const sql = runtime.getSql();

    // =====================================================
    // GET CLIENTS + FILES + PERMISSIONS
    // =====================================================

    if (req.method === "GET") {

      const clients = await sql`
        SELECT
          client_key,
          display_name,
          company,
          auth_type,
          legacy_scope,
          username,
          status
        FROM portal_clients
        ORDER BY
          CASE WHEN auth_type = 'legacy_scope' THEN 0 ELSE 1 END,
          display_name
      `;

      /*
       * Detect portal_files primary key dynamically.
       * No assumption about UUID/TEXT/etc.
       */
      const pkRows = await sql`
        SELECT a.attname AS column_name
        FROM pg_index i
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid
         AND a.attnum = ANY(i.indkey)
        WHERE
          i.indrelid = 'portal_files'::regclass
          AND i.indisprimary
        LIMIT 1
      `;

      const filePk =
        pkRows[0]?.column_name || null;

      const rawFiles = await sql`
        SELECT to_jsonb(pf) AS file
        FROM portal_files pf
      `;

      const files = rawFiles.map(row => {
        const file = row.file || {};

        return {
          ...file,
          _portalFileId:
            filePk ? file[filePk] : null
        };
      });

      const permissions = await sql`
        SELECT
          client_key,
          file_id,
          can_view,
          can_download
        FROM portal_client_file_permissions
      `;

      return http.sendJson(res, 200, {
        clients,
        files,
        permissions
      });
    }

    // =====================================================
    // UPDATE ONE FILE PERMISSION
    // =====================================================

    if (req.method === "POST") {

      const schema = z.object({
        clientKey: z.string().min(1).max(300),
        fileId: z.union([
          z.string().min(1),
          z.number()
        ]),
        canView: z.boolean(),
        canDownload: z.boolean()
      });

      const parsed = schema.safeParse(
        await http.readJson(req)
      );

      if (!parsed.success) {
        return http.validationError(res, parsed);
      }

      const {
        clientKey,
        fileId,
        canView,
        canDownload
      } = parsed.data;

      const client = await sql`
        SELECT client_key
        FROM portal_clients
        WHERE
          client_key = ${clientKey}
          AND status = 'active'
        LIMIT 1
      `;

      if (!client.length) {
        return http.sendJson(res, 404, {
          error: "Client not found or disabled."
        });
      }

      /*
       * No access at all => remove permission row.
       */
      if (!canView && !canDownload) {

        await sql`
          DELETE FROM portal_client_file_permissions
          WHERE
            client_key = ${clientKey}
            AND file_id = ${fileId}
        `;

      } else {

        /*
         * Download implies view.
         */
        const finalView =
          canDownload ? true : canView;

        await sql`
          INSERT INTO portal_client_file_permissions (
            client_key,
            file_id,
            can_view,
            can_download,
            granted_by,
            created_at,
            updated_at
          )
          VALUES (
            ${clientKey},
            ${fileId},
            ${finalView},
            ${canDownload},
            ${gate.auth.userId},
            NOW(),
            NOW()
          )

          ON CONFLICT (client_key, file_id)

          DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_download = EXCLUDED.can_download,
            granted_by = EXCLUDED.granted_by,
            updated_at = NOW()
        `;
      }

      await runtime.writeAudit({
        actorUserId: gate.auth.userId,
        action: "CLIENT_FILE_PERMISSION_UPDATED",
        targetType: "client",
        targetId: clientKey,
        details: {
          fileId: String(fileId),
          canView,
          canDownload
        }
      });

      return http.sendJson(res, 200, {
        ok: true
      });
    }

    return http.methodNotAllowed(
      res,
      ["GET", "POST"]
    );

  } catch (error) {

    console.error(
      "client-file-access API:",
      error
    );

    return http.sendJson(res, 500, {
      error: "Internal server error."
    });
  }
}
