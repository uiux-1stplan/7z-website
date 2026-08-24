import { getClerk, getSql } from "../lib/portal-runtime.mjs";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "7Z Admin";
const company = process.env.BOOTSTRAP_ADMIN_COMPANY?.trim() || "7Z Magic";

if (!email) {
  console.error("Admin email is required.");
  process.exit(1);
}

if (!password || password.length < 8) {
  console.error("Password must contain at least 8 characters.");
  process.exit(1);
}

const clerk = getClerk();
const sql = getSql();

console.log("\nChecking Clerk user...");

const existing = await clerk.users.getUserList({
  emailAddress: [email],
  limit: 1,
});

let user;

if (existing.data.length > 0) {
  user = existing.data[0];

  console.log("Existing Clerk user found.");
  console.log("Updating password securely...");

  user = await clerk.users.updateUser(user.id, {
    password,
    signOutOfOtherSessions: true,
  });
} else {
  console.log("Creating Clerk admin user...");

  user = await clerk.users.createUser({
    emailAddress: [email],
    password,
  });
}

console.log("Synchronizing admin with Neon...");

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
    ${user.id},
    ${email},
    ${displayName},
    ${company},
    'admin',
    'active',
    NOW(),
    NOW()
  )

  ON CONFLICT (clerk_user_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    company = EXCLUDED.company,
    role = 'admin',
    status = 'active',
    updated_at = NOW()
`;

await sql`
  INSERT INTO portal_audit_log (
    actor_user_id,
    action,
    target_type,
    target_id,
    details
  )
  VALUES (
    ${user.id},
    'ADMIN_BOOTSTRAP',
    'user',
    ${user.id},
    ${JSON.stringify({
      email,
      displayName,
      company,
    })}::jsonb
  )
`;

const check = await sql`
  SELECT
    clerk_user_id,
    email,
    display_name,
    company,
    role,
    status
  FROM portal_users
  WHERE clerk_user_id = ${user.id}
`;

console.log("\n================================");
console.log("7Z PORTAL ADMIN READY");
console.log("================================");

console.log("User ID:     ", check[0].clerk_user_id);
console.log("Email:       ", check[0].email);
console.log("Name:        ", check[0].display_name);
console.log("Company:     ", check[0].company);
console.log("Role:        ", check[0].role);
console.log("Status:      ", check[0].status);

console.log("\nPassword was sent to Clerk only.");
console.log("Password was NOT stored in Neon.");
