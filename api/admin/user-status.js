export default async function handler(req, res) {
  const [
    runtime,
    http,
    zod
  ] = await Promise.all([
    import("../../lib/portal-runtime.mjs"),
    import("../../lib/vercel-api.mjs"),
    import("zod"),
  ]);

  const { z } = zod;

  try {
    if (req.method !== "POST") {
      return http.methodNotAllowed(
        res,
        ["POST"]
      );
    }

    const gate = await runtime.requireAdmin(
      http.toWebRequest(req)
    );

    if (!gate.ok) {
      return http.sendWebResponse(
        res,
        gate.response
      );
    }

    const schema = z.object({
      userId: z.string().min(1),

      status: z.enum([
        "active",
        "disabled",
      ]),
    });

    const parsed = schema.safeParse(
      await http.readJson(req)
    );

    if (!parsed.success) {
      return http.validationError(
        res,
        parsed
      );
    }

    const {
      userId,
      status,
    } = parsed.data;

    if (
      userId === gate.auth.userId &&
      status === "disabled"
    ) {
      return http.sendJson(res, 400, {
        error:
          "You cannot disable your own admin account.",
      });
    }

    const sql = runtime.getSql();
    const clerk = runtime.getClerk();

    const target = await sql`
      SELECT
        clerk_user_id,
        email,
        role,
        status
      FROM portal_users
      WHERE clerk_user_id = ${userId}
      LIMIT 1
    `;

    if (!target.length) {
      return http.sendJson(res, 404, {
        error: "User not found.",
      });
    }

    try {
      if (status === "disabled") {
        await clerk.users.banUser(userId);
      } else {
        await clerk.users.unbanUser(userId);
      }
    } catch (error) {
      console.error(
        "Clerk status update failed:",
        error
      );

      return http.sendJson(
        res,
        400,
        http.clerkPublicError(
          error,
          "User status could not be updated."
        )
      );
    }

    try {
      await sql`
        UPDATE portal_users
        SET
          status = ${status},
          updated_at = NOW()
        WHERE clerk_user_id = ${userId}
      `;
    } catch (databaseError) {
      console.error(
        "Portal DB status update failed:",
        databaseError
      );

      // Best-effort rollback
      try {
        if (status === "disabled") {
          await clerk.users.unbanUser(
            userId
          );
        } else {
          await clerk.users.banUser(
            userId
          );
        }
      } catch (rollbackError) {
        console.error(
          "Clerk status rollback failed:",
          rollbackError
        );
      }

      return http.sendJson(res, 500, {
        error:
          "User status could not be synchronized.",
      });
    }

    try {
      await runtime.writeAudit({
        actorUserId: gate.auth.userId,
        action:
          status === "active"
            ? "USER_ENABLED"
            : "USER_DISABLED",
        targetType: "user",
        targetId: userId,
        details: {
          email: target[0].email,
        },
      });
    } catch (auditError) {
      console.error(
        "Audit log failed:",
        auditError
      );
    }

    return http.sendJson(res, 200, {
      success: true,
      status,
    });

  } catch (error) {
    console.error(
      "Status API error:",
      error
    );

    return http.sendJson(res, 500, {
      error: "Internal server error",
    });
  }
};

