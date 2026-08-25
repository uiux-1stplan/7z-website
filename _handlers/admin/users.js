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
    // POST - CREATE USER
    // ==============================================

    if (req.method !== "POST") {
      return http.methodNotAllowed(
        res,
        ["GET", "POST"]
      );
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

