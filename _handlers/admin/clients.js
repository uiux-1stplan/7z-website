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
        "PATCH"
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
