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

      role: z.enum([
        "user",
        "admin",
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
      role,
    } = parsed.data;

    if (
      userId === gate.auth.userId &&
      role !== "admin"
    ) {
      return http.sendJson(res, 400, {
        error:
          "You cannot remove your own admin role.",
      });
    }

    const sql = runtime.getSql();

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

    if (
      target[0].role === "admin" &&
      role === "user"
    ) {
      const adminCount = await sql`
        SELECT COUNT(*)::int AS count
        FROM portal_users
        WHERE
          role = 'admin'
          AND status = 'active'
      `;

      if (adminCount[0].count <= 1) {
        return http.sendJson(res, 400, {
          error:
            "The last active admin cannot be demoted.",
        });
      }
    }

    await sql`
      UPDATE portal_users
      SET
        role = ${role},
        updated_at = NOW()
      WHERE clerk_user_id = ${userId}
    `;

    try {
      await runtime.writeAudit({
        actorUserId: gate.auth.userId,
        action: "USER_ROLE_CHANGED",
        targetType: "user",
        targetId: userId,
        details: {
          email: target[0].email,
          previousRole:
            target[0].role,
          role,
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
      role,
    });

  } catch (error) {
    console.error(
      "Role API error:",
      error
    );

    return http.sendJson(res, 500, {
      error: "Internal server error",
    });
  }
};

