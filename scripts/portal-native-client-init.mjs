import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!url) {
  throw new Error("DATABASE_URL missing.");
}

const sql = neon(url);

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS
    portal_clients_username_lower_unique
  ON portal_clients (LOWER(username))
  WHERE username IS NOT NULL
`;

await sql`
  CREATE TABLE IF NOT EXISTS portal_client_sessions (
    token_hash TEXT PRIMARY KEY,

    client_key TEXT NOT NULL
      REFERENCES portal_clients(client_key)
      ON DELETE CASCADE,

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
      DEFAULT NOW(),

    last_seen_at TIMESTAMPTZ NOT NULL
      DEFAULT NOW()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS
    portal_client_sessions_client_idx
  ON portal_client_sessions(client_key)
`;

await sql`
  CREATE INDEX IF NOT EXISTS
    portal_client_sessions_expiry_idx
  ON portal_client_sessions(expires_at)
`;

console.log("NATIVE CLIENT DATABASE READY");
