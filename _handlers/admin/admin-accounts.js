import {
  getClerk,
  getSql,
  requireAdmin,
  writeAudit
} from "../../lib/portal-runtime.mjs";

import {
  toWebRequest
} from "../../lib/vercel-api.mjs";


function send(
  res,
  status,
  body
) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  return res
    .status(status)
    .json(body);
}


async function readBody(req) {

  if (
    req.body &&
    typeof req.body === "object"
  ) {
    return req.body;
  }

  if (
    typeof req.body === "string"
  ) {

    try {
      return JSON.parse(
        req.body
      );
    } catch {
      return {};
    }
  }

  return {};
}


function cleanText(
  value,
  max = 160
) {

  return String(
    value || ""
  )
    .trim()
    .slice(0, max);
}


function cleanEmail(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function validEmail(value) {

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(value)
  );
}


function safeClerkError(error) {

  const message =
    error?.errors?.[0]?.longMessage ||
    error?.errors?.[0]?.message ||
    error?.message ||
    "";

  if (
    /password/i.test(message)
  ) {

    return (
      "Password does not meet the Clerk security policy."
    );
  }

  if (
    /email|identifier|already/i.test(
      message
    )
  ) {

    return (
      "This email may already be registered."
    );
  }

  return (
    "Administrator operation failed."
  );
}


export default async function handler(
  req,
  res
) {

  try {

    const gate =
      await requireAdmin(
        toWebRequest(req)
      );


    if (!gate.ok) {

      const response =
        gate.response;

      const payload =
        await response.json();

      return send(
        res,
        response.status,
        payload
      );
    }


    const sql =
      getSql();

    const clerk =
      getClerk();


    // =====================================================
    // GET — LIST ADMINS
    // =====================================================

    if (
      req.method === "GET"
    ) {

      const admins =
        await sql`
          SELECT
            clerk_user_id,
            email,
            display_name,
            company,
            role,
            status,
            created_at,
            updated_at

          FROM portal_users

          WHERE
            role = 'admin'

          ORDER BY
            CASE
              WHEN status = 'active'
              THEN 0
              ELSE 1
            END,
            LOWER(
              COALESCE(
                display_name,
                email
              )
            )
        `;


      return send(
        res,
        200,
        {
          ok: true,

          currentAdminId:
            gate.auth.userId,

          admins
        }
      );
    }


    // =====================================================
    // POST — CREATE ADMIN
    // =====================================================

    if (
      req.method === "POST"
    ) {

      const body =
        await readBody(req);


      const displayName =
        cleanText(
          body.displayName,
          120
        );


      const company =
        cleanText(
          body.company,
          160
        );


      const email =
        cleanEmail(
          body.email
        );


      const password =
        String(
          body.password || ""
        );


      if (!displayName) {

        return send(
          res,
          400,
          {
            error:
              "Administrator name is required."
          }
        );
      }


      if (
        !email ||
        !validEmail(email)
      ) {

        return send(
          res,
          400,
          {
            error:
              "A valid email address is required."
          }
        );
      }


      if (
        password.length < 12
      ) {

        return send(
          res,
          400,
          {
            error:
              "Password must contain at least 12 characters."
          }
        );
      }


      const duplicate =
        await sql`
          SELECT
            clerk_user_id

          FROM portal_users

          WHERE
            LOWER(email) =
              ${email}

          LIMIT 1
        `;


      if (duplicate.length) {

        return send(
          res,
          409,
          {
            error:
              "An account with this email already exists."
          }
        );
      }


      let clerkUser = null;


      try {

        clerkUser =
          await clerk
            .users
            .createUser({
              emailAddress: [
                email
              ],

              password
            });


        await sql`
          INSERT INTO portal_users (
            clerk_user_id,
            email,
            display_name,
            company,
            role,
            status,
            created_at,
            updated_at
          )

          VALUES (
            ${clerkUser.id},
            ${email},
            ${displayName},
            ${company || null},
            'admin',
            'active',
            NOW(),
            NOW()
          )
        `;


        await writeAudit({

          actorUserId:
            gate.auth.userId,

          action:
            "ADMIN_CREATED",

          targetType:
            "portal_user",

          targetId:
            clerkUser.id,

          details: {
            email,
            displayName,
            company:
              company || null,

            role:
              "admin"
          }
        });


        return send(
          res,
          201,
          {
            ok: true,

            admin: {
              clerk_user_id:
                clerkUser.id,

              email,

              display_name:
                displayName,

              company:
                company || null,

              role:
                "admin",

              status:
                "active"
            }
          }
        );


      } catch (error) {

        /*
         * Roll back Clerk user if Neon insert failed.
         */
        if (clerkUser?.id) {

          try {

            const exists =
              await sql`
                SELECT
                  clerk_user_id

                FROM portal_users

                WHERE
                  clerk_user_id =
                    ${clerkUser.id}

                LIMIT 1
              `;


            if (!exists.length) {

              await clerk
                .users
                .deleteUser(
                  clerkUser.id
                );
            }

          } catch (
            rollbackError
          ) {

            console.error(
              "Admin create rollback:",
              rollbackError
            );
          }
        }


        console.error(
          "Create admin:",
          error
        );


        return send(
          res,
          400,
          {
            error:
              safeClerkError(
                error
              )
          }
        );
      }
    }


    // =====================================================
    // PATCH — PASSWORD / STATUS
    // =====================================================

    if (
      req.method === "PATCH"
    ) {

      const body =
        await readBody(req);


      const action =
        cleanText(
          body.action,
          40
        );


      const targetId =
        cleanText(
          body.clerkUserId,
          200
        );


      if (!targetId) {

        return send(
          res,
          400,
          {
            error:
              "Administrator ID is required."
          }
        );
      }


      const rows =
        await sql`
          SELECT
            clerk_user_id,
            email,
            display_name,
            role,
            status

          FROM portal_users

          WHERE
            clerk_user_id =
              ${targetId}

            AND role =
              'admin'

          LIMIT 1
        `;


      const target =
        rows[0];


      if (!target) {

        return send(
          res,
          404,
          {
            error:
              "Administrator not found."
          }
        );
      }


      // ---------------------------------------------------
      // CHANGE PASSWORD
      // ---------------------------------------------------

      if (
        action ===
        "password"
      ) {

        const password =
          String(
            body.password || ""
          );


        if (
          password.length < 12
        ) {

          return send(
            res,
            400,
            {
              error:
                "Password must contain at least 12 characters."
            }
          );
        }


        try {

          await clerk
            .users
            .updateUser(
              targetId,
              {
                password,

                signOutOfOtherSessions:
                  true
              }
            );


          await writeAudit({

            actorUserId:
              gate.auth.userId,

            action:
              "ADMIN_PASSWORD_CHANGED",

            targetType:
              "portal_user",

            targetId,

            details: {
              email:
                target.email
            }
          });


          return send(
            res,
            200,
            {
              ok: true
            }
          );


        } catch (error) {

          console.error(
            "Admin password:",
            error
          );


          return send(
            res,
            400,
            {
              error:
                safeClerkError(
                  error
                )
            }
          );
        }
      }


      // ---------------------------------------------------
      // ENABLE / DISABLE
      // ---------------------------------------------------

      if (
        action ===
        "status"
      ) {

        const status =
          body.status ===
          "disabled"
            ? "disabled"
            : body.status ===
              "active"
              ? "active"
              : null;


        if (!status) {

          return send(
            res,
            400,
            {
              error:
                "Invalid administrator status."
            }
          );
        }


        /*
         * Never allow self-disable.
         */
        if (
          status ===
            "disabled" &&
          targetId ===
            gate.auth.userId
        ) {

          return send(
            res,
            400,
            {
              error:
                "You cannot disable your own administrator account."
            }
          );
        }


        /*
         * Never disable the final active Admin.
         */
        if (
          status ===
          "disabled"
        ) {

          const count =
            await sql`
              SELECT
                COUNT(*)::int
                  AS count

              FROM portal_users

              WHERE
                role = 'admin'
                AND status =
                  'active'
            `;


          if (
            Number(
              count[0]?.count || 0
            ) <= 1
          ) {

            return send(
              res,
              400,
              {
                error:
                  "The last active administrator cannot be disabled."
              }
            );
          }
        }


        try {

          if (
            status ===
            "disabled"
          ) {

            await clerk
              .users
              .banUser(
                targetId
              );

          } else {

            await clerk
              .users
              .unbanUser(
                targetId
              );
          }


          await sql`
            UPDATE portal_users

            SET
              status =
                ${status},

              updated_at =
                NOW()

            WHERE
              clerk_user_id =
                ${targetId}
          `;


          await writeAudit({

            actorUserId:
              gate.auth.userId,

            action:
              "ADMIN_STATUS_CHANGED",

            targetType:
              "portal_user",

            targetId,

            details: {
              email:
                target.email,

              status
            }
          });


          return send(
            res,
            200,
            {
              ok: true
            }
          );


        } catch (error) {

          console.error(
            "Admin status:",
            error
          );


          return send(
            res,
            500,
            {
              error:
                "Could not update administrator status."
            }
          );
        }
      }


      return send(
        res,
        400,
        {
          error:
            "Unsupported administrator action."
        }
      );
    }


    res.setHeader(
      "Allow",
      "GET, POST, PATCH"
    );


    return send(
      res,
      405,
      {
        error:
          "Method not allowed."
      }
    );


  } catch (error) {

    console.error(
      "Admin accounts:",
      error
    );


    return send(
      res,
      500,
      {
        error:
          "Administrator management temporarily unavailable."
      }
    );
  }
}

