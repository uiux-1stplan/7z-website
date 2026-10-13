import crypto from "node:crypto";

import {
  hashPortalPassword,
  normalizeClientId
} from "../../lib/portal-client-auth.mjs";


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


    const sql =
      runtime.getSql();


    // =====================================================
    // LIST ALL CLIENTS
    // =====================================================

    if (
      req.method === "GET"
    ) {

      const clients =
        await sql`
          SELECT
            client_key,
            display_name,
            company,
            auth_type,
            legacy_scope,
            username,
            status,
            created_at,
            updated_at

          FROM portal_clients

          ORDER BY
            CASE
              WHEN auth_type =
                'legacy_scope'
              THEN 0
              ELSE 1
            END,
            LOWER(display_name)
        `;


      return http.sendJson(
        res,
        200,
        {
          clients
        }
      );
    }



    // =====================================================
    // DELETE ONE CLIENT ACCOUNT (ADMIN-ONLY, FILES PRESERVED)
    // =====================================================
    if (req.method === "DELETE") {
      const origin = String(req.headers.origin || "");
      if (origin !== "https://7z-magic.com" && origin !== "https://www.7z-magic.com") return http.sendJson(res, 403, { error: "Same-origin administrator request required." });
      const parsed = z.object({ confirmation: z.literal("DELETE_CLIENT_ACCOUNT"), clientKey: z.string().trim().min(1).max(200) }).safeParse(await http.readJson(req));
      if (!parsed.success) return http.validationError(res, parsed);
      const [targetRows, fileRows, foreignKeys] = await Promise.all([
        sql`SELECT client_key, display_name, auth_type, legacy_scope FROM portal_clients WHERE client_key = ${parsed.data.clientKey} LIMIT 1`,
        sql`SELECT COUNT(*)::int AS file_count FROM portal_files`,
        sql`SELECT DISTINCT tc.table_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_schema = 'public' AND ccu.table_name = 'portal_clients' AND ccu.column_name = 'client_key'`
      ]);
      const target = targetRows[0];
      if (!target) return http.sendJson(res, 404, { error: "Client not found. No account or file was changed." });
      const safeClientTables = new Set(["portal_client_sessions", "portal_client_file_permissions", "portal_client_resource_permissions"]);
      const unexpectedTables = foreignKeys.map(row => String(row.table_name)).filter(name => !safeClientTables.has(name));
      if (unexpectedTables.length) return http.sendJson(res, 409, { error: "Deletion stopped because an unreviewed table references client accounts." });
      await sql`CREATE TABLE IF NOT EXISTS portal_retired_legacy_scopes (scope TEXT PRIMARY KEY, retired_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      const result = await sql`
        WITH target_client AS MATERIALIZED (
          SELECT client_key, legacy_scope FROM portal_clients
          WHERE client_key = ${parsed.data.clientKey} FOR UPDATE
        ),
        guard AS (SELECT COUNT(*)::int AS matched_count FROM target_client),
        retired_scope AS (
          INSERT INTO portal_retired_legacy_scopes (scope)
          SELECT target.legacy_scope FROM target_client target CROSS JOIN guard
          WHERE target.legacy_scope IS NOT NULL AND guard.matched_count = 1
          ON CONFLICT (scope) DO NOTHING RETURNING scope
        ),
        removed_resource_permissions AS (
          DELETE FROM portal_client_resource_permissions permission
          USING target_client target, guard
          WHERE permission.client_key = target.client_key AND guard.matched_count = 1
          RETURNING permission.client_key
        ),
        removed_file_permissions AS (
          DELETE FROM portal_client_file_permissions permission
          USING target_client target, guard
          WHERE permission.client_key = target.client_key AND guard.matched_count = 1
            AND (SELECT COUNT(*) FROM removed_resource_permissions) >= 0
          RETURNING permission.client_key
        ),
        removed_sessions AS (
          DELETE FROM portal_client_sessions session
          USING target_client target, guard
          WHERE session.client_key = target.client_key AND guard.matched_count = 1
            AND (SELECT COUNT(*) FROM removed_file_permissions) >= 0
          RETURNING session.client_key
        ),
        deleted_client AS (
          DELETE FROM portal_clients client
          USING target_client target, guard
          WHERE client.client_key = target.client_key AND guard.matched_count = 1
            AND (SELECT COUNT(*) FROM removed_sessions) >= 0
            AND (SELECT COUNT(*) FROM removed_file_permissions) >= 0
            AND (SELECT COUNT(*) FROM removed_resource_permissions) >= 0
            AND (SELECT COUNT(*) FROM retired_scope) >= 0
          RETURNING client.client_key
        ),
        audit_record AS (
          INSERT INTO portal_audit_log (actor_user_id, action, target_type, target_id, details)
          SELECT ${gate.auth.userId}, 'CLIENT_ACCOUNT_DELETED', 'client', ${parsed.data.clientKey},
            jsonb_build_object('displayName', ${target.display_name}::text, 'authType', ${target.auth_type}::text, 'filesDeleted', false)
          FROM deleted_client RETURNING id
        )
        SELECT guard.matched_count,
          (SELECT COUNT(*)::int FROM deleted_client) AS deleted_count,
          (SELECT COUNT(*)::int FROM audit_record) AS audit_count
        FROM guard
      `;
      const deletion = result[0];
      if (Number(deletion?.matched_count) !== 1 || Number(deletion?.deleted_count) !== 1 || Number(deletion?.audit_count) !== 1) {
        return http.sendJson(res, 409, { error: "The account changed before deletion completed. Refresh the list and try again.", deletedCount: Number(deletion?.deleted_count || 0) });
      }
      const [afterFiles] = await sql`SELECT COUNT(*)::int AS file_count FROM portal_files`;
      const filesUnchanged = Number(fileRows[0].file_count) === Number(afterFiles.file_count);
      return http.sendJson(res, 200, { ok: true, deletedCount: 1, clientKey: target.client_key, displayName: target.display_name, authType: target.auth_type, filesDeleted: false, filesUnchanged, fileCount: Number(afterFiles.file_count) });
    }


    // =====================================================
    // CREATE NATIVE CLIENT
    // =====================================================

    if (
      req.method === "POST"
    ) {

      const schema =
        z.object({

          displayName:
            z.string()
              .trim()
              .min(1)
              .max(120),

          username:
            z.string()
              .trim()
              .min(3)
              .max(64)
              .regex(
                /^[A-Za-z0-9._-]+$/,
                "Client ID can contain letters, numbers, ., _ and - only."
              ),

          company:
            z.string()
              .trim()
              .max(160)
              .optional()
              .default(""),

          password:
            z.string()
              .min(12)
              .max(200)
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


      const username =
        normalizeClientId(
          parsed.data.username
        );


      const duplicate =
        await sql`
          SELECT
            client_key

          FROM portal_clients

          WHERE
            LOWER(username) =
              ${username}

          LIMIT 1
        `;


      if (duplicate.length) {

        return http.sendJson(
          res,
          409,
          {
            error:
              "This Client ID already exists."
          }
        );
      }


      const passwordHash =
        await hashPortalPassword(
          parsed.data.password
        );


      const clientKey =
        `native:${crypto.randomUUID()}`;


      const inserted =
        await sql`
          INSERT INTO portal_clients (
            client_key,
            display_name,
            company,
            auth_type,
            username,
            password_hash,
            status,
            created_at,
            updated_at
          )

          VALUES (
            ${clientKey},
            ${parsed.data.displayName},
            ${parsed.data.company || null},
            'native',
            ${username},
            ${passwordHash},
            'active',
            NOW(),
            NOW()
          )

          RETURNING
            client_key,
            display_name,
            company,
            auth_type,
            username,
            status,
            created_at
        `;


      await runtime.writeAudit({

        actorUserId:
          gate.auth.userId,

        action:
          "NATIVE_CLIENT_CREATED",

        targetType:
          "client",

        targetId:
          clientKey,

        details: {
          username,
          displayName:
            parsed.data.displayName
        }
      });


      return http.sendJson(
        res,
        201,
        {
          client:
            inserted[0]
        }
      );
    }


    // =====================================================
    // PASSWORD / ENABLE / DISABLE
    // =====================================================

    if (
      req.method === "PATCH"
    ) {

      const schema =
        z.discriminatedUnion(
          "action",
          [

            z.object({

              action:
                z.literal(
                  "password"
                ),

              clientKey:
                z.string()
                  .min(1),

              password:
                z.string()
                  .min(12)
                  .max(200)
            }),

            z.object({

              action:
                z.literal(
                  "status"
                ),

              clientKey:
                z.string()
                  .min(1),

              status:
                z.enum([
                  "active",
                  "disabled"
                ])
            })

          ]
        );


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


      const rows =
        await sql`
          SELECT
            client_key,
            username,
            legacy_scope,
            auth_type,
            status

          FROM portal_clients

          WHERE
            client_key =
              ${parsed.data.clientKey}

          LIMIT 1
        `;


      const client =
        rows[0];


      if (!client) {

        return http.sendJson(
          res,
          404,
          {
            error:
              "Client not found."
          }
        );
      }


      if (
        parsed.data.action ===
        "password"
      ) {

        if (
          client.auth_type !==
          "native"
        ) {

          return http.sendJson(
            res,
            400,
            {
              error:
                "Legacy credentials remain managed by the original Private Access system."
            }
          );
        }


        const passwordHash =
          await hashPortalPassword(
            parsed.data.password
          );


        await sql`
          UPDATE portal_clients

          SET
            password_hash =
              ${passwordHash},

            updated_at =
              NOW()

          WHERE
            client_key =
              ${parsed.data.clientKey}
        `;


        await sql`
          DELETE FROM
            portal_client_sessions

          WHERE
            client_key =
              ${parsed.data.clientKey}
        `;


        await runtime.writeAudit({

          actorUserId:
            gate.auth.userId,

          action:
            "CLIENT_PASSWORD_CHANGED",

          targetType:
            "client",

          targetId:
            parsed.data.clientKey,

          details: {
            authType:
              client.auth_type
          }
        });
      }


      if (
        parsed.data.action ===
        "status"
      ) {

        await sql`
          UPDATE portal_clients

          SET
            status =
              ${parsed.data.status},

            updated_at =
              NOW()

          WHERE
            client_key =
              ${parsed.data.clientKey}
        `;


        /*
         * Session revocation is immediate
         * for BOTH legacy and native clients.
         */
        if (
          parsed.data.status ===
          "disabled"
        ) {

          await sql`
            DELETE FROM
              portal_client_sessions

            WHERE
              client_key =
                ${parsed.data.clientKey}
          `;
        }


        await runtime.writeAudit({

          actorUserId:
            gate.auth.userId,

          action:
            "CLIENT_STATUS_CHANGED",

          targetType:
            "client",

          targetId:
            parsed.data.clientKey,

          details: {
            authType:
              client.auth_type,

            status:
              parsed.data.status
          }
        });
      }


      return http.sendJson(
        res,
        200,
        {
          ok: true
        }
      );
    }


    return http.methodNotAllowed(
      res,
      [
        "GET",
        "POST",
        "PATCH",
        "DELETE"
      ]
    );


  } catch (error) {

    console.error(
      "clients API:",
      error
    );


    return http.sendJson(
      res,
      500,
      {
        error:
          "Client operation failed."
      }
    );
  }
}
