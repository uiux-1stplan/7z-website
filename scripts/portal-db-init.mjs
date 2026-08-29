import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const sql = neon(databaseUrl);

const schemaPath = new URL("../db/portal-schema.sql", import.meta.url);
const schema = fs.readFileSync(schemaPath, "utf8");

/*
  The schema file contains only trusted application SQL.
  Split statements here so Neon HTTP executes them individually.
*/
const statements = schema
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} schema statements...`);

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];

  try {
    await sql.query(statement, []);
    console.log(`  [${i + 1}/${statements.length}] OK`);
  } catch (error) {
    console.error(`\nStatement ${i + 1} failed.`);
    console.error(error?.message || error);
    process.exit(1);
  }
}

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'portal_%'
  ORDER BY table_name
`;

console.log("\n7Z Portal tables:");

for (const row of tables) {
  console.log(`  ✓ ${row.table_name}`);
}

console.log("\nDATABASE FOUNDATION READY");
