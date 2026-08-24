import { neon } from "@neondatabase/serverless";
import { HUB_PUBLIC_SCOPES } from "../lib/private-access.js";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL / POSTGRES_URL is missing.");
}

const sql = neon(databaseUrl);

if (
  !Array.isArray(HUB_PUBLIC_SCOPES) ||
  HUB_PUBLIC_SCOPES.length === 0
) {
  throw new Error("No HUB_PUBLIC_SCOPES were found.");
}

console.log("");
console.log("Legacy scopes detected:");
for (const scope of HUB_PUBLIC_SCOPES) {
  console.log(`  - ${scope}`);
}

/*
 * Unified client registry.
 *
 * legacy_scope = existing /private-access/ identity
 * native       = future Client ID + Password accounts
 */
await sql`
  CREATE TABLE IF NOT EXISTS portal_clients (
    client_key TEXT PRIMARY KEY,

    display_name TEXT NOT NULL,
    company TEXT,

    auth_type TEXT NOT NULL
      CHECK (auth_type IN ('legacy_scope', 'native')),

    legacy_scope TEXT UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'disabled')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
      (
        auth_type = 'legacy_scope'
        AND legacy_scope IS NOT NULL
      )
      OR
      (
        auth_type = 'native'
        AND username IS NOT NULL
      )
    )
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS
    portal_clients_auth_type_idx
  ON portal_clients(auth_type)
`;

await sql`
  CREATE INDEX IF NOT EXISTS
    portal_clients_status_idx
  ON portal_clients(status)
`;

/*
 * Automatically create one legacy profile
 * for every scope already used by the old system.
 */
function labelFromScope(scope) {
  return String(scope)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

for (const scope of HUB_PUBLIC_SCOPES) {
  const clientKey = `legacy:${scope}`;
  const displayName = labelFromScope(scope);

  await sql`
    INSERT INTO portal_clients (
      client_key,
      display_name,
      auth_type,
      legacy_scope,
      status
    )
    VALUES (
      ${clientKey},
      ${displayName},
      'legacy_scope',
      ${scope},
      'active'
    )

    ON CONFLICT (client_key)
    DO UPDATE SET
      legacy_scope = EXCLUDED.legacy_scope,
      updated_at = NOW()
  `;
}

/*
 * Create permissions table using the REAL primary-key
 * type of portal_files, without assuming UUID/TEXT/etc.
 */
await sql`
  DO $$
  DECLARE
    file_pk_name TEXT;
    file_pk_type TEXT;
  BEGIN

    SELECT
      a.attname,
      format_type(a.atttypid, a.atttypmod)
    INTO
      file_pk_name,
      file_pk_type

    FROM pg_index i

    JOIN pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = ANY(i.indkey)

    WHERE
      i.indrelid = 'portal_files'::regclass
      AND i.indisprimary

    LIMIT 1;

    IF file_pk_name IS NULL THEN
      RAISE EXCEPTION
        'portal_files primary key could not be detected';
    END IF;

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS portal_client_file_permissions (
        client_key TEXT NOT NULL
          REFERENCES portal_clients(client_key)
          ON DELETE CASCADE,

        file_id %s NOT NULL
          REFERENCES portal_files(%I)
          ON DELETE CASCADE,

        can_view BOOLEAN NOT NULL DEFAULT TRUE,
        can_download BOOLEAN NOT NULL DEFAULT TRUE,

        granted_by TEXT
          REFERENCES portal_users(clerk_user_id)
          ON DELETE SET NULL,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        PRIMARY KEY (client_key, file_id)
      )',
      file_pk_type,
      file_pk_name
    );

  END
  $$;
`;

const clients = await sql`
  SELECT
    client_key,
    display_name,
    auth_type,
    legacy_scope,
    status
  FROM portal_clients
  ORDER BY auth_type, display_name
`;

console.log("");
console.log("Portal client registry:");
console.table(clients);

console.log("");
console.log("LEGACY BRIDGE DATABASE READY");
