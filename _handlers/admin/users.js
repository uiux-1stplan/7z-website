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
    const gate = await runtime.requireAdmin(
      http.toWebRequest(req)
    );

    if (!gate.ok) {
      return http.sendWebResponse(res, gate.response);
    }

    const sql = runtime.getSql();
    const clerk = runtime.getClerk();

    // ==============================================
    // GET - LIST USERS
    // ==============================================

    if (req.method === "GET") {
      const users = await sql`
        SELECT
          clerk_user_id AS id,
          email,
          display_name AS name,
          company,
          role,
          status,
          created_at,
          updated_at
        FROM portal_users
        ORDER BY created_at DESC
      `;

      return http.sendJson(res, 200, {
        users,
      });
    }

        // ==============================================
    // PATCH - EDIT USER PROFILE
    // ==============================================
    if (req.method === "PATCH") {
      const schema = z.object({
        userId: z.string().trim().min(1),
        displayName: z.string().trim().min(1).max(120),
        company: z.string().trim().max(160).optional().default(""),
      });
      const parsed = schema.safeParse(await http.readJson(req));
      if (!parsed.success) return http.validationError(res, parsed);
      const updated = await sql`
        UPDATE portal_users
        SET display_name = ${parsed.data.displayName},
            company = ${parsed.data.company || null},
            updated_at = NOW()
        WHERE clerk_user_id = ${parsed.data.userId}
        RETURNING clerk_user_id AS id, email, display_name AS name, company, role, status, created_at, updated_at
      `;
      if (!updated.length) return http.sendJson(res, 404, { error: "Portal user not found." });
      try {
        await runtime.writeAudit({ actorUserId: gate.auth.userId, action: "USER_PROFILE_UPDATED", targetType: "user", targetId: parsed.data.userId, details: { displayName: parsed.data.displayName, company: parsed.data.company } });
      } catch (auditError) { console.error("Audit log failed:", auditError); }
      return http.sendJson(res, 200, { user: updated[0] });
    }

    // ==============================================
    // DELETE - REMOVE USER ACCOUNT
    // ==============================================
    if (req.method === "DELETE") {
      const schema = z.object({ id: z.string().trim().min(1).optional(), userId: z.string().trim().min(1).optional() })
        .refine((value) => Boolean(value.id || value.userId), { message: "A user ID is required." });
      const parsed = schema.safeParse(await http.readJson(req));
      if (!parsed.success) return http.validationError(res, parsed);
      const userId = parsed.data.userId || parsed.data.id;
      if (userId === gate.auth.userId) return http.sendJson(res, 400, { error: "You cannot delete your own administrator account." });
      const existing = await sql`SELECT clerk_user_id, email FROM portal_users WHERE clerk_user_id = ${userId} LIMIT 1`;
      if (!existing.length) return http.sendJson(res, 404, { error: "Portal user not found." });
      try {
        await clerk.users.deleteUser(userId);
      } catch (error) {
        console.error("Clerk deleteUser failed:", error);
        return http.sendJson(res, 502, { error: "The authentication account could not be removed." });
      }
      await sql`DELETE FROM portal_users WHERE clerk_user_id = ${userId}`;
      try {
        await runtime.writeAudit({ actorUserId: gate.auth.userId, action: "USER_DELETED", targetType: "user", targetId: userId, details: { email: existing[0].email } });
      } catch (auditError) { console.error("Audit log failed:", auditError); }
      return http.sendJson(res, 200, { ok: true, userId });
    }

// ==============================================
    // POST - CREATE USER
    // ==============================================

    if (req.method !== "POST") {
      return http.methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
    }

    const schema = z.object({
      email: z.string().email().max(320),

      password: z
        .string()
        .min(8)
        .max(128),

      displayName: z
        .string()
        .trim()
        .min(1)
        .max(120),

      company: z
        .string()
        .trim()
        .max(160)
        .optional()
        .default(""),

      role: z
        .enum(["user", "admin"])
        .optional()
        .default("user"),
    });

    const body = await http.readJson(req);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return http.validationError(res, parsed);
    }

    const email =
      parsed.data.email
        .trim()
        .toLowerCase();

    const {
      password,
      displayName,
      company,
      role,
    } = parsed.data;

    // Database duplicate check
    const databaseExisting = await sql`
      SELECT clerk_user_id
      FROM portal_users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `;

    if (databaseExisting.length) {
      return http.sendJson(res, 409, {
        error: "A portal user with this email already exists.",
      });
    }

    // Clerk duplicate check
    const clerkExisting =
      await clerk.users.getUserList({
        emailAddress: [email],
        limit: 1,
      });

    if (clerkExisting.data.length) {
      return http.sendJson(res, 409, {
        error:
          "This email already exists in the authentication system.",
      });
    }

    let clerkUser = null;

    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        password,
      });
    } catch (error) {
      console.error("Clerk createUser failed:", error);

      return http.sendJson(
        res,
        400,
        http.clerkPublicError(
          error,
          "Could not create user."
        )
      );
    }

    try {
      const inserted = await sql`
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
          ${role},
          'active',
          NOW(),
          NOW()
        )
        RETURNING
          clerk_user_id AS id,
          email,
          display_name AS name,
          company,
          role,
          status,
          created_at
      `;

      try {
        await runtime.writeAudit({
          actorUserId: gate.auth.userId,
          action: "USER_CREATED",
          targetType: "user",
          targetId: clerkUser.id,
          details: {
            email,
            displayName,
            company,
            role,
          },
        });
      } catch (auditError) {
        console.error(
          "Audit log failed:",
          auditError
        );
      }

      return http.sendJson(res, 201, {
        user: inserted[0],
      });

    } catch (databaseError) {
      console.error(
        "Portal DB user insert failed:",
        databaseError
      );

      // Roll back Clerk user if DB creation fails
      try {
        await clerk.users.deleteUser(
          clerkUser.id
        );
      } catch (rollbackError) {
        console.error(
          "Clerk rollback failed:",
          rollbackError
        );
      }

      return http.sendJson(res, 500, {
        error:
          "User creation could not be completed.",
      });
    }

  } catch (error) {
    console.error(
      "Admin users API error:",
      error
    );

    return http.sendJson(res, 500, {
      error: "Internal server error",
    });
  }
};

