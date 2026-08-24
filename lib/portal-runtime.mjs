import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";

let _clerk = null;
let _sql = null;

export function getClerk() {
  if (!_clerk) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    const publishableKey =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY;

    if (!secretKey) {
      throw new Error("CLERK_SECRET_KEY is missing");
    }

    if (!publishableKey) {
      throw new Error("Clerk publishable key is missing");
    }

    _clerk = createClerkClient({
      secretKey,
      publishableKey,
    });
  }

  return _clerk;
}

export function getSql() {
  if (!_sql) {
    const databaseUrl =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    _sql = neon(databaseUrl);
  }

  return _sql;
}

function getAuthorizedParties() {
  const parties = new Set([
    "https://7z-magic.com",
    "https://www.7z-magic.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  if (process.env.VERCEL_URL) {
    parties.add(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    parties.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  if (process.env.PORTAL_AUTHORIZED_PARTIES) {
    process.env.PORTAL_AUTHORIZED_PARTIES
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((x) => parties.add(x));
  }

  return [...parties];
}

export async function authenticatePortalRequest(request) {
  const clerk = getClerk();

  const state = await clerk.authenticateRequest(request, {
    authorizedParties: getAuthorizedParties(),
    acceptsToken: "session_token",
  });

  const auth = state.toAuth();

  if (!auth.userId) {
    return {
      authenticated: false,
      userId: null,
      portalUser: null,
    };
  }

  const sql = getSql();

  const rows = await sql`
    SELECT
      clerk_user_id,
      email,
      display_name,
      company,
      role,
      status
    FROM portal_users
    WHERE clerk_user_id = ${auth.userId}
    LIMIT 1
  `;

  const portalUser = rows[0] || null;

  if (!portalUser || portalUser.status !== "active") {
    return {
      authenticated: false,
      userId: auth.userId,
      portalUser,
    };
  }

  return {
    authenticated: true,
    userId: auth.userId,
    portalUser,
  };
}

export async function requirePortalUser(request) {
  const auth = await authenticatePortalRequest(request);

  if (!auth.authenticated) {
    return {
      ok: false,
      response: Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    auth,
  };
}

export async function requireAdmin(request) {
  const result = await requirePortalUser(request);

  if (!result.ok) {
    return result;
  }

  if (result.auth.portalUser.role !== "admin") {
    return {
      ok: false,
      response: Response.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return result;
}

export async function writeAudit({
  actorUserId = null,
  action,
  targetType = null,
  targetId = null,
  details = {},
}) {
  const sql = getSql();

  await sql`
    INSERT INTO portal_audit_log (
      actor_user_id,
      action,
      target_type,
      target_id,
      details
    )
    VALUES (
      ${actorUserId},
      ${action},
      ${targetType},
      ${targetId},
      ${JSON.stringify(details)}::jsonb
    )
  `;
}
