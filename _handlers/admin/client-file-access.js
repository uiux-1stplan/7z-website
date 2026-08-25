import {
  HUB_PUBLIC_SCOPES,
  PRIVATE_RESOURCES,
  hubResourcePayload
} from "../../lib/private-access.js";


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
    // GET EVERYTHING
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
            status

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


      const rawFiles =
        await sql`
          SELECT
            id,
            original_name,
            content_type,
            size_bytes,
            created_at,
            is_active

          FROM portal_files

          WHERE
            is_active = TRUE

          ORDER BY
            created_at DESC
        `;


      const filePermissions =
        await sql`
          SELECT
            client_key,
            file_id,
            can_view,
            can_download

          FROM portal_client_file_permissions
        `;


      const legacyPermissions =
        await sql`
          SELECT
            client_key,
            resource_scope,
            can_view

          FROM portal_client_resource_permissions
        `;


      const resources = [];


      /*
       * Original protected HTML/PDF experiences.
       */
      for (
        const scope
        of HUB_PUBLIC_SCOPES
      ) {

        const resource =
          PRIVATE_RESOURCES[
            scope
          ];


        const payload =
          hubResourcePayload(
            scope
          );


        resources.push({

          key:
            `legacy:${scope}`,

          type:
            "legacy",

          scope,

          name:
            payload?.label ||
            scope,

          openPath:
            resource?.paths?.[0] ||
            null,

          canDownload:
            false
        });
      }


      /*
       * New uploaded files.
       */
      for (
        const file
        of rawFiles
      ) {

        resources.push({

          key:
            `file:${file.id}`,

          type:
            "file",

          fileId:
            String(
              file.id
            ),

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
            file.created_at,

          canDownload:
            true
        });
      }


      const permissions = [];


      for (
        const permission
        of legacyPermissions
      ) {

        permissions.push({

          client_key:
            permission.client_key,

          resource_key:
            `legacy:${
              permission.resource_scope
            }`,

          can_view:
            Boolean(
              permission.can_view
            ),

          can_download:
            false
        });
      }


      for (
        const permission
        of filePermissions
      ) {

        permissions.push({

          client_key:
            permission.client_key,

          resource_key:
            `file:${
              permission.file_id
            }`,

          can_view:
            Boolean(
              permission.can_view
            ),

          can_download:
            Boolean(
              permission.can_download
            )
        });
      }


      return http.sendJson(
        res,
        200,
        {
          clients,
          resources,
          permissions
        }
      );
    }


    // =====================================================
    // UPDATE ONE CLIENT × RESOURCE
    // =====================================================

    if (
      req.method === "POST"
    ) {

      const schema =
        z.object({

          clientKey:
            z.string()
              .min(1)
              .max(300),

          resourceType:
            z.enum([
              "legacy",
              "file"
            ]),

          resourceId:
            z.string()
              .min(1)
              .max(300),

          canView:
            z.boolean(),

          canDownload:
            z.boolean()
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
        clientKey,
        resourceType,
        resourceId,
        canView,
        canDownload
      } =
        parsed.data;


      const clients =
        await sql`
          SELECT
            client_key

          FROM portal_clients

          WHERE
            client_key =
              ${clientKey}

          LIMIT 1
        `;


      if (!clients.length) {

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
        resourceType ===
        "legacy"
      ) {

        if (
          !HUB_PUBLIC_SCOPES.includes(
            resourceId
          )
        ) {

          return http.sendJson(
            res,
            400,
            {
              error:
                "Invalid protected resource."
            }
          );
        }


        if (!canView) {

          await sql`
            DELETE FROM
              portal_client_resource_permissions

            WHERE
              client_key =
                ${clientKey}

              AND resource_scope =
                ${resourceId}
          `;

        } else {

          await sql`
            INSERT INTO portal_client_resource_permissions (
              client_key,
              resource_scope,
              can_view,
              granted_by,
              created_at,
              updated_at
            )

            VALUES (
              ${clientKey},
              ${resourceId},
              TRUE,
              ${gate.auth.userId},
              NOW(),
              NOW()
            )

            ON CONFLICT (
              client_key,
              resource_scope
            )

            DO UPDATE SET
              can_view =
                TRUE,

              granted_by =
                EXCLUDED.granted_by,

              updated_at =
                NOW()
          `;
        }
      }


      if (
        resourceType ===
        "file"
      ) {

        const files =
          await sql`
            SELECT
              id

            FROM portal_files

            WHERE
              id::text =
                ${resourceId}

              AND is_active =
                TRUE

            LIMIT 1
          `;


        if (!files.length) {

          return http.sendJson(
            res,
            404,
            {
              error:
                "File not found."
            }
          );
        }


        if (
          !canView &&
          !canDownload
        ) {

          await sql`
            DELETE FROM
              portal_client_file_permissions

            WHERE
              client_key =
                ${clientKey}

              AND file_id::text =
                ${resourceId}
          `;

        } else {

          const finalView =
            canDownload
              ? true
              : canView;


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
              ${resourceId},
              ${finalView},
              ${canDownload},
              ${gate.auth.userId},
              NOW(),
              NOW()
            )

            ON CONFLICT (
              client_key,
              file_id
            )

            DO UPDATE SET
              can_view =
                EXCLUDED.can_view,

              can_download =
                EXCLUDED.can_download,

              granted_by =
                EXCLUDED.granted_by,

              updated_at =
                NOW()
          `;
        }
      }


      /*
       * Any permission modification ends the client's
       * live portal session. On next login they receive
       * the new permission set immediately.
       */
      await sql`
        DELETE FROM portal_client_sessions
        WHERE client_key = ${clientKey}
      `;


      await runtime.writeAudit({

        actorUserId:
          gate.auth.userId,

        action:
          "CLIENT_RESOURCE_PERMISSION_UPDATED",

        targetType:
          "client",

        targetId:
          clientKey,

        details: {
          resourceType,
          resourceId,
          canView,
          canDownload:
            resourceType ===
            "file"
              ? canDownload
              : false
        }
      });


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
        "POST"
      ]
    );


  } catch (error) {

    console.error(
      "Unified access control:",
      error
    );


    return http.sendJson(
      res,
      500,
      {
        error:
          "Unified access control failed."
      }
    );
  }
}
