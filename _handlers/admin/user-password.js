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
      userId: z
        .string()
        .min(1),

      password: z
        .string()
        .min(8)
        .max(128),
    });

    const body = await http.readJson(req);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return http.validationError(
        res,
        parsed
      );
    }

    const {
      userId,
      password,
    } = parsed.data;

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

    try {
      await runtime
        .getClerk()
        .users
        .updateUser(userId, {
          password,
          signOutOfOtherSessions: true,
        });
    } catch (error) {
      console.error(
        "Clerk password update failed:",
        error
      );

      return http.sendJson(
        res,
        400,
        http.clerkPublicError(
          error,
          "Password could not be updated."
        )
      );
    }

    try {
      await runtime.writeAudit({
        actorUserId: gate.auth.userId,
        action: "USER_PASSWORD_RESET",
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
    });

  } catch (error) {
    console.error(
      "Password API error:",
      error
    );

    return http.sendJson(res, 500, {
      error: "Internal server error",
    });
  }
};

